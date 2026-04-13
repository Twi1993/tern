/** Format as whole-dollar currency: $1,234 */
export function fmt(value: number): string {
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
}

/** Format as currency with cents when non-zero: $116.50 or $116 */
export function fmtExact(value: number): string {
  const hasCents = value % 1 !== 0
  return value.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: 2,
  })
}

/** Format a signed delta: +$201 or −$45 */
export function fmtDelta(value: number): string {
  const abs = fmt(Math.abs(value))
  return value >= 0 ? `+${abs}` : `−${abs}`
}
