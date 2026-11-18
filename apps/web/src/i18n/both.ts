import { createTranslator } from "next-intl";
import en from "../../messages/en.json";
import vi from "../../messages/vi.json";

export type Both = { vi: string; en: string };
type T = (key: string, values?: Record<string, string | number>) => string;
const T_VI = createTranslator({ locale: "vi", messages: vi }) as unknown as T;
const T_EN = createTranslator({ locale: "en", messages: en }) as unknown as T;

/**
 * A message in both languages, for search that finds an item by either (R25). A value may itself
 * be given in both languages ({ vi, en }), for example a component's name inside "Add {name}".
 */
export function both(key: string, values?: Record<string, string | number | Both>): Both {
  const pick = (lang: "vi" | "en") =>
    values && Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v === "object" ? v[lang] : v]));
  return { vi: T_VI(key, pick("vi")), en: T_EN(key, pick("en")) };
}
