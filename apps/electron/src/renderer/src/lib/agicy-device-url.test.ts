import { describe, expect, it } from "vitest";
import { AGICY_DEVICE_PAGE, agicyDeviceSignInUrl } from "./agicy-device-url";

describe("agicyDeviceSignInUrl", () => {
  it("always builds the production agicy.ai device page", () => {
    expect(agicyDeviceSignInUrl("KAZY3Q53")).toBe(
      "https://agicy.ai/updated/my_device?user_code=KAZY3Q53",
    );
    expect(AGICY_DEVICE_PAGE).toBe("https://agicy.ai/updated/my_device");
  });

  it("encodes the user code", () => {
    expect(agicyDeviceSignInUrl("AB12 CD34")).toBe(
      "https://agicy.ai/updated/my_device?user_code=AB12%20CD34",
    );
  });
});
