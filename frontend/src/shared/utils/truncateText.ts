export function truncateText(value: string, maxLength: number) {
  if (maxLength <= 0) {
    return "";
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length <= maxLength) {
    return normalizedValue;
  }

  return `${normalizedValue.slice(0, maxLength).trimEnd()}...`;
}
