/** Lowest `${prefix}${n}` (n >= 1) not in `taken`. */
export function nextId(prefix: string, taken: Iterable<string>): string {
  const set = new Set(taken);
  for (let n = 1; ; n++) {
    const id = `${prefix}${n}`;
    if (!set.has(id)) return id;
  }
}

/** The number in an id made by nextId(`${kind}-`, …), or null for any other id. */
export function nodeNumber(id: string, kind: string): number | null {
  if (!id.startsWith(`${kind}-`)) return null;
  const rest = id.slice(kind.length + 1);
  return /^[1-9]\d*$/.test(rest) ? Number(rest) : null;
}
