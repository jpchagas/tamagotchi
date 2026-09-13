// Mock data source for condition details.
// Replace the body of getConditionDetails with a real fetch() call once the
// backend endpoint exists — the rest of the app only depends on this function's
// signature (conditionId in, condition object out), so no other file needs to change.

const CONDITION_DATA = {
  oncologico: {
    title: 'Risco Oncológico',
    alertCount: '1 achado que exige ação',
    alertText:
      'Seu risco para câncer colorretal está acima do esperado para sua faixa etária.',
    indicators: [
      'Idade: 37 anos',
      'Histórico familiar: positivo (pai com câncer de cólon aos 62 anos)',
      'Exame de sangue: CEA elevado (3,2 ng/mL)',
      'Última colonoscopia: 2021 (há 4 anos)',
    ],
    nextAction: 'Colonoscopia',
    nextActionWhen: 'Em até 30 dias',
    source: 'NCCN Guidelines (v. 2024)',
  },
  cardiovascular: {
    title: 'Risco Cardiovascular',
    alertCount: '1 achado em acompanhamento',
    alertText: 'Seus marcadores lipídicos seguem sendo monitorados de perto.',
    indicators: ['Idade: 37 anos', 'LDL: 98 mg/dL (melhorando)', 'Pressão arterial: 128/82 mmHg'],
    nextAction: 'Repetir perfil lipídico',
    nextActionWhen: 'Em 23 dias',
    source: 'AHA Guidelines (v. 2024)',
  },
  cerebro: {
    title: 'Saúde Cerebral',
    alertCount: 'Sem achados de atenção',
    alertText: 'Seus indicadores cognitivos e de sono estão dentro do esperado.',
    indicators: ['Sono médio: 7h20', 'Sem histórico familiar relevante'],
    nextAction: 'Reavaliação de rotina',
    nextActionWhen: 'Em 6 meses',
    source: 'Rotina clínica padrão',
  },
  metabolico: {
    title: 'Saúde Metabólica',
    alertCount: 'Em melhora',
    alertText: 'Seus indicadores metabólicos vêm melhorando nos últimos meses.',
    indicators: ['HbA1c: 5,6% (estável)', 'Gordura visceral: -8% no período'],
    nextAction: 'Repetir HbA1c',
    nextActionWhen: 'Em 3 meses',
    source: 'Rotina clínica padrão',
  },
}

export async function getConditionDetails(conditionId) {
  // --- Future real implementation ---
  // const res = await fetch(`${import.meta.env.VITE_API_URL}/conditions/${conditionId}`)
  // if (!res.ok) throw new Error('Failed to load condition details')
  // return res.json()

  // --- Current mock implementation ---
  return CONDITION_DATA[conditionId] ?? CONDITION_DATA.oncologico
}
