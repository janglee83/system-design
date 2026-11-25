export type Messages = { [key: string]: string | Messages };

/** Nested catalog -> { "a.b.c": "text" }. */
export function flatten(messages: Messages, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(messages)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}

/** Sorted, unique ICU argument names in a message (`{name}`, `{n, plural, …}`). */
export function icuArgs(text: string): string[] {
  const names = new Set<string>();
  for (const m of text.matchAll(/\{\s*([A-Za-z_]\w*)\s*[,}]/g)) names.add(m[1]!);
  return [...names].sort();
}
