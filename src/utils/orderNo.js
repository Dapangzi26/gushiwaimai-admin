export function coerceOrderNoString(value) {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  if (typeof value === 'string') {
    return value.trim()
  }

  // 超过 16 位的订单号不能走 Number，否则末位会被 JS 精度抹掉。
  if (typeof value === 'number' && !Number.isSafeInteger(value)) {
    console.warn('[orderNo] 检测到可能已丢失精度的数字订单号', value)
  }

  return String(value).trim()
}

export function normalizeOrderNoDigits(value) {
  return coerceOrderNoString(value).replace(/\s+/g, '').replace(/\+/g, '').replace(/\D/g, '')
}

export function looksLikeOrderNumber(value) {
  const digits = normalizeOrderNoDigits(value)
  return digits.length >= 10
}

export function normalizeSearchKeyword(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) {
    return ''
  }

  // 订单号、手机号、商家 ID 等纯数字字段展示时可能带空格/加号/横线，查库前需还原。
  if (/^[\d\s+\-]+$/.test(trimmed)) {
    return normalizeOrderNoDigits(trimmed)
  }

  return trimmed
}

export function normalizeSearchFieldValue(value) {
  const trimmed = String(value ?? '').trim()
  if (!trimmed) {
    return ''
  }

  if (/^[\d\s+\-]+$/.test(trimmed)) {
    return normalizeOrderNoDigits(trimmed)
  }

  return trimmed.toLowerCase()
}

export function matchesLocalSearchKeyword(keyword, fields = []) {
  const normalizedKeyword = normalizeSearchKeyword(keyword).toLowerCase()
  if (!normalizedKeyword) {
    return true
  }

  const haystack = fields
    .filter((field) => field !== null && field !== undefined && field !== '')
    .map((field) => normalizeSearchFieldValue(field))
    .join(' ')

  return haystack.includes(normalizedKeyword)
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
