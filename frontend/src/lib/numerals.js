// Normalize keyboard input only. Stored numeric values remain ordinary JS numbers.
export const latinDigits = value => String(value ?? '')
  .replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 0x06f0))
  .replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x0660))

export const numericInput = value => latinDigits(value).replace(/[٫,]/g, '.')
