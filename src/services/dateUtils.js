// "Em X dias" from today, matching the design's relative-date style.
// Shared by examsService and conductsService.
export function formatRelativeDate(date) {
  if (!date) return ''
  const diffMs = date.getTime() - Date.now()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))
  if (diffDays < 0) return 'Atrasado'
  if (diffDays === 0) return 'Hoje'
  if (diffDays === 1) return 'Amanhã'
  if (diffDays < 30) return `Em ${diffDays} dias`
  if (diffDays < 365) {
    const months = Math.round(diffDays / 30)
    return months === 1 ? 'Em 1 mês' : `Em ${months} meses`
  }
  const years = Math.round(diffDays / 365)
  return years === 1 ? 'Em 1 ano' : `Em ${years} anos`
}

// "há 2 h", "ontem", "há 5 dias", or the date — for things that happened.
export function formatTimeAgo(date) {
  if (!date) return ''
  const minutes = Math.round((Date.now() - date.getTime()) / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `há ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `há ${hours} h`
  const days = Math.round(hours / 24)
  if (days === 1) return 'ontem'
  if (days < 30) return `há ${days} dias`
  return date.toLocaleDateString('pt-BR')
}
