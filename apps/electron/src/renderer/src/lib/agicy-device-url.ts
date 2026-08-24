/** Production device page. Sign in always opens this host — never the API's URL. */
export const AGICY_DEVICE_PAGE = "https://agicy.ai/updated/my_device";

export function agicyDeviceSignInUrl(userCode: string): string {
  return `${AGICY_DEVICE_PAGE}?user_code=${encodeURIComponent(userCode)}`;
}
