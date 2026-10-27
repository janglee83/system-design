/** Lowercase ASCII-ish text for accent-insensitive search (R25). */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
}
