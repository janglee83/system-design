import { headers } from "next/headers";
import { themeScript } from "./theme";

/** The theme head script (R26), carrying this request's CSP nonce. */
export async function ThemeScript() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} />;
}
