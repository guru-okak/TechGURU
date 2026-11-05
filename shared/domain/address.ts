export function isMoscowAddress(value: string): boolean {
  return /^(?:(?:г\.?|город)\s*)?москва$/iu.test(value.split(',', 1)[0].trim())
}

export function isCompleteAddress(value: string): boolean {
  const [city, street, house] = value.split(',').map(part => part.trim())
  return /\p{L}/u.test(city ?? '') && /\p{L}/u.test(street ?? '')
    && /^(?:(?:д\.|дом)\s*)?\d[\p{L}\d\s./-]*$/iu.test(house ?? '')
}
