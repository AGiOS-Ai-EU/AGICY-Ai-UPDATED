/** Production device page. Sign in always opens this host — never the API's URL. */
export const AGICY_DEVICE_PAGE = "https://agicy.ai/updated/my_device";

export type AgicySignInVia = "agicy" | "crgpt" | "google";

export function agicyDeviceSignInUrl(
  userCode: string,
  via: AgicySignInVia = "agicy",
): string {
  const url = new URL(AGICY_DEVICE_PAGE);
  url.searchParams.set("user_code", userCode);
  if (via !== "agicy") url.searchParams.set("via", via);
  return url.toString();
}
