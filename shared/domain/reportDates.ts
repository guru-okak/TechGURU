const moscowCalendar = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', dateStyle: 'short' })

export function moscowDate(value: string | Date = new Date()): string {
  return moscowCalendar.format(new Date(value))
}

export function reportDay(offset: number, now = new Date()): string {
  const date = new Date(moscowDate(now) + 'T12:00:00+03:00')
  date.setUTCDate(date.getUTCDate() + offset)
  return moscowDate(date)
}
