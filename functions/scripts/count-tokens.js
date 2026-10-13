// Standalone validation script (not used by the app): counts the input
// tokens processUploadedFile would send to Claude for a local PDF, using the
// free token counting endpoint. Nothing is generated or billed.
//
// Usage (from functions/):
//   node scripts/count-tokens.js <file.pdf> [prescription|examRequest|examResult] [--model <id>]
//
// The model defaults to EXTRACTION_MODEL in functions/.env, and the API key
// is read from ANTHROPIC_API_KEY (environment or functions/.secret.local).

const fs = require('fs')
const path = require('path')
const Anthropic = require('@anthropic-ai/sdk')

// Existing environment variables win over the files.
for (const file of ['.env', '.secret.local']) {
  try {
    process.loadEnvFile(path.join(__dirname, '..', file))
  } catch {
    // File missing: rely on the environment.
  }
}

// List prices in USD per million input tokens (platform.claude.com/pricing).
const INPUT_PRICE_PER_MTOK = {
  'claude-opus-5-5': 4,
  'claude-opus-5': 5,
  'claude-sonnet-5-5': 2,
  'claude-sonnet-5': 2,
  'claude-haiku-4-5': 1,
}

// Copies of the system prompts, instructions and schemas in functions/index.js,
// so the count matches the real request. Keep them in sync if those change.
const BASE_RULES = 'Extraia somente o que está claramente escrito no documento. Não invente, não complete e não estime valores. Se não encontrar nada, retorne uma lista vazia.'

const KINDS = {
  prescription: {
    system: `Você extrai medicamentos de receitas médicas brasileiras. ${BASE_RULES}`,
    instruction: 'Extraia os medicamentos desta receita.',
    schema: {
      type: 'object',
      properties: {
        medications: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Nome do medicamento, como escrito na receita' },
              dosage: { type: 'string', description: 'Dose/concentração, ex: "20 mg"' },
              instructions: { type: 'string', description: 'Posologia e orientações, ex: "1 comprimido à noite"' },
            },
            required: ['name'],
            additionalProperties: false,
          },
        },
      },
      required: ['medications'],
      additionalProperties: false,
    },
  },
  examRequest: {
    system: `Você extrai os exames solicitados em pedidos médicos brasileiros. ${BASE_RULES}`,
    instruction: 'Extraia os exames solicitados neste pedido.',
    schema: {
      type: 'object',
      properties: {
        exams: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string', description: 'Nome do exame, ex: "Hemograma completo"' },
              notes: { type: 'string', description: 'Preparo ou observação, se houver, ex: "jejum de 12h"' },
            },
            required: ['name'],
            additionalProperties: false,
          },
        },
      },
      required: ['exams'],
      additionalProperties: false,
    },
  },
  examResult: {
    // The real prompt also lists the metric definitions from Firestore,
    // which adds a few hundred tokens that this count leaves out.
    system: `Você extrai resultados numéricos de laudos laboratoriais brasileiros. ${BASE_RULES}`,
    instruction: 'Extraia os resultados deste laudo.',
    schema: {
      type: 'object',
      properties: {
        readings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              metricKey: {
                type: 'string',
                description: 'Chave de uma métrica existente da lista fornecida, ou uma nova chave em camelCase sem acentos se nenhuma corresponder',
              },
              label: { type: 'string', description: 'Nome do exame como aparece no laudo' },
              value: { type: 'number', description: 'Valor numérico (vírgula decimal convertida para ponto)' },
              unit: { type: 'string' },
              collectedOn: { type: 'string', description: 'Data de coleta YYYY-MM-DD, se visível no laudo' },
            },
            required: ['metricKey', 'label', 'value'],
            additionalProperties: false,
          },
        },
      },
      required: ['readings'],
      additionalProperties: false,
    },
  },
}

function parseArgs(argv) {
  const args = { model: process.env.EXTRACTION_MODEL || 'claude-opus-5', kind: 'examResult' }
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--model') args.model = argv[++i]
    else positional.push(argv[i])
  }
  ;[args.file, args.kind = args.kind] = positional
  return args
}

async function main() {
  const { file, kind, model } = parseArgs(process.argv.slice(2))
  if (!file || !KINDS[kind] || !model) {
    console.error('Usage: node scripts/count-tokens.js <file.pdf> [prescription|examRequest|examResult] [--model <id>]')
    process.exit(1)
  }
  if (path.extname(file).toLowerCase() !== '.pdf') {
    console.error('Only PDF files are supported.')
    process.exit(1)
  }

  const fileBuffer = fs.readFileSync(file)
  const { system, instruction, schema } = KINDS[kind]
  const client = new Anthropic()

  const { input_tokens: inputTokens } = await client.messages.countTokens({
    model,
    system,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: fileBuffer.toString('base64') } },
          { type: 'text', text: instruction },
        ],
      },
    ],
    output_config: { format: { type: 'json_schema', schema } },
  })

  console.log(`File:         ${path.basename(file)} (${(fileBuffer.length / 1024).toFixed(1)} KB)`)
  console.log(`Kind:         ${kind}`)
  console.log(`Model:        ${model}`)
  console.log(`Input tokens: ${inputTokens.toLocaleString('en-US')}`)

  const price = INPUT_PRICE_PER_MTOK[model]
  if (price) {
    console.log(`Input cost:   ~$${((inputTokens / 1_000_000) * price).toFixed(4)} (at $${price}/MTok list price)`)
  }
  console.log('Output and thinking tokens are billed on top of this and are only known after a real call.')
}

main().catch((err) => {
  if (err instanceof Anthropic.AuthenticationError) {
    console.error('Invalid or missing API key. Set ANTHROPIC_API_KEY or add it to functions/.secret.local.')
  } else if (err instanceof Anthropic.NotFoundError) {
    console.error(`Model not found: ${err.message}`)
  } else if (err instanceof Anthropic.BadRequestError) {
    console.error(`Request rejected: ${err.message}`)
  } else if (err instanceof Anthropic.APIError) {
    console.error(`API error ${err.status}: ${err.message}`)
  } else {
    console.error(err.message)
  }
  process.exit(1)
})
