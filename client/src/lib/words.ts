/** Names as a sentence would list them: "Visa", "Visa and Car loan", "Visa, Car loan and Store card". */
export function listNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? '';
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
