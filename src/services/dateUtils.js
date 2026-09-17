// "Em X dias" from today, matching the design's relative-date style.
// Shared by examsService and conductsService.
export function formatRelativeDate(date) {
  if (!date) return ''
  const diffMs = date.getTime() - Date.now()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'Atrasado'
  if (diffDays === 0) return 'Hoje'
  if (diffDays < 30) return `Em ${diffDays} dias`
  if (diffDays < 365) return `Em ${Math.round(diffDays / 30)} meses`
  return `Em ${Math.round(diffDays / 365)} anos`
}
