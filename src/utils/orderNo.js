export function normalizeOrderNoDigits(value) {
  return String(value ?? '').replace(/\s+/g, '').replace(/\D/g, '')
}

export function formatOrderNoDisplay(value) {
  const digits = normalizeOrderNoDigits(value)
  if (!digits) {
    return ''
  }
  if (digits.length === 19) {
    return `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)} ${digits.slice(12, 16)} ${digits.slice(16, 19)}`
  }
  const chunks = []
  for (let i = 0; i < digits.length; i += 4) {
    chunks.push(digits.slice(i, i + 4))
  }
  return chunks.join(' ').trim()
}
