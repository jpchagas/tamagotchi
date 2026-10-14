// Same limits as the Cloud Function (functions/index.js) and storage.rules.
export const MAX_FILE_BYTES = 14 * 1024 * 1024
export const SUPPORTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg']

export function validateFile(file) {
  if (!SUPPORTED_TYPES.includes(file.type)) return 'Formato não suportado. Use PDF, PNG ou JPG.'
  if (file.size > MAX_FILE_BYTES) return 'O arquivo é maior que 14 MB.'
  return ''
}
