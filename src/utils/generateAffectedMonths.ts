export type PropagationMode = 'only_this' | 'this_and_previous' | 'this_and_next' | 'all'

export const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export const generateAffectedMonths = (
  mode: PropagationMode,
  month: number,
  year: number,
  dataInicio?: string | null,
  dataPerda?: string | null,
): { month: number; year: number }[] => {
  const results: { month: number; year: number }[] = []

  let minMonth = 0, minYear = 2024
  let maxMonth = 11, maxYear = 2030

  if (dataInicio) {
    try {
      const d = new Date(dataInicio.substring(0, 10) + 'T12:00:00')
      minMonth = d.getMonth()
      minYear = d.getFullYear()
    } catch {}
  }

  if (dataPerda) {
    try {
      const d = new Date(dataPerda.substring(0, 10) + 'T12:00:00')
      maxMonth = d.getMonth()
      maxYear = d.getFullYear()
    } catch {}
  } else {
    const now = new Date()
    maxMonth = now.getMonth()
    maxYear = now.getFullYear() + 1
  }

  const toNum = (m: number, y: number) => y * 12 + m
  const minNum = toNum(minMonth, minYear)
  const maxNum = toNum(maxMonth, maxYear)
  const selectedNum = toNum(month, year)

  let startNum: number, endNum: number

  switch (mode) {
    case 'only_this':
      startNum = selectedNum
      endNum = selectedNum
      break
    case 'this_and_previous':
      startNum = minNum
      endNum = selectedNum
      break
    case 'this_and_next':
      startNum = selectedNum
      endNum = maxNum
      break
    case 'all':
      startNum = minNum
      endNum = maxNum
      break
  }

  for (let n = Math.max(startNum, minNum); n <= Math.min(endNum, maxNum); n++) {
    results.push({ month: n % 12, year: Math.floor(n / 12) })
  }

  return results
}

export const getPropagationDescription = (mode: PropagationMode, month: number, year: number): string => {
  const monthLabel = `${MONTHS_FULL[month]}/${String(year).slice(-2)}`
  switch (mode) {
    case 'only_this': return `apenas para o mês de ${monthLabel}`
    case 'this_and_previous': return `para ${monthLabel} e todos os meses anteriores`
    case 'this_and_next': return `para ${monthLabel} e todos os meses seguintes`
    case 'all': return `para todos os meses`
  }
}
