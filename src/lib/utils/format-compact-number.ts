const BILLION = 1_000_000_000;
const MILLION = 1_000_000;
const THOUSAND = 1_000;
const MAX_FRACTION_DIGITS = 3;

function formatAbbreviatedValue(value: number, divisor: number, suffix: string) {
  return `${(value / divisor).toFixed(1)}${suffix}`;
}

function formatFractionalValue(value: number) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: MAX_FRACTION_DIGITS,
  }).format(value);
}

export function formatCompactNumber(value: number) {
  const absoluteValue = Math.abs(value);

  if (absoluteValue >= BILLION) {
    return formatAbbreviatedValue(value, BILLION, "B");
  }

  if (absoluteValue >= MILLION) {
    return formatAbbreviatedValue(value, MILLION, "M");
  }

  if (absoluteValue >= THOUSAND) {
    return formatAbbreviatedValue(value, THOUSAND, "k");
  }

  if (!Number.isInteger(value)) {
    return formatFractionalValue(value);
  }

  return String(value);
}
