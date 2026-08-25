import { BrowserWindow, shell } from "electron";

/**
 * UPDATED's panel uses alwaysOnTop at "screen-saver" level, so the system
 * browser from shell.openExternal often appears *behind* the app on Windows.
 * Open https links in a focused BrowserWindow that matches that z-order.
 */

let authWindow: BrowserWindow | null = null;
let externalWindow: BrowserWindow | null = null;
let externalHoldCount = 0;
let cancelPanelHide: (() => void) | null = null;
let getPanelWindow: (() => BrowserWindow | null) | null = null;

/** Wire panel hide suppression so blur-from-auth doesn't dismiss the panel. */
export function configureOpenExternalFocused(opts: {
  getPanelWindow: () => BrowserWindow | null;
  cancelPanelHide: () => void;
}): void {
  getPanelWindow = opts.getPanelWindow;
  cancelPanelHide = opts.cancelPanelHide;
}

export function isExternalFocusHeld(): boolean {
  return externalHoldCount > 0;
}

function beginHold(): void {
  externalHoldCount += 1;
  cancelPanelHide?.();
}

function endHold(): void {
  externalHoldCount = Math.max(0, externalHoldCount - 1);
}

function isAuthUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes("/updated/my_device");
  } catch {
    return false;
  }
}

function focusWindow(win: BrowserWindow): void {
  if (win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.setAlwaysOnTop(true, "screen-saver");
  win.show();
  win.focus();
  win.moveTop();
  // Stay sticky briefly so Windows doesn't bury us under the panel again.
  setTimeout(() => {
    if (!win.isDestroyed()) win.setAlwaysOnTop(true, "screen-saver");
  }, 400);
  setTimeout(() => {
    if (!win.isDestroyed()) {
      // Keep above normal windows but allow the user to Alt-Tab freely later.
      win.setAlwaysOnTop(true, "floating");
    }
  }, 4000);
}

function createFocusedBrowserWindow(opts: {
  url: string;
  title: string;
  width: number;
  height: number;
  slot: "auth" | "external";
}): BrowserWindow {
  const parent = getPanelWindow?.() ?? null;
  const parentOk = parent && !parent.isDestroyed() ? parent : undefined;

  const win = new BrowserWindow({
    width: opts.width,
    height: opts.height,
    parent: parentOk,
    modal: false,
    show: false,
    autoHideMenuBar: true,
    title: opts.title,
    backgroundColor: "#f4efe6",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  beginHold();
  win.on("closed", () => {
    endHold();
    if (opts.slot === "auth") authWindow = null;
    else externalWindow = null;
  });

  void win.loadURL(opts.url);
  win.once("ready-to-show", () => focusWindow(win));
  // ready-to-show can be flaky on some Windows builds; always focus shortly after.
  setTimeout(() => focusWindow(win), 200);

  return win;
}

function reuseOrCreate(
  existing: BrowserWindow | null,
  opts: {
    url: string;
    title: string;
    width: number;
    height: number;
    slot: "auth" | "external";
  },
): BrowserWindow {
  if (existing && !existing.isDestroyed()) {
    void existing.loadURL(opts.url);
    focusWindow(existing);
    return existing;
  }
  return createFocusedBrowserWindow(opts);
}

/** Close the sign-in BrowserWindow after approval or cancel. */
export function closeAuthBrowserWindow(): void {
  if (authWindow && !authWindow.isDestroyed()) {
    authWindow.close();
  }
  authWindow = null;
}

/**
 * Open a URL in front of UPDATED. http(s) → focused BrowserWindow;
 * mailto → shell.openExternal.
 */
export async function openExternalFocused(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === "mailto:") {
      await shell.openExternal(parsed.toString());
      return true;
    }
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }

    const href = parsed.toString();
    if (isAuthUrl(href)) {
      authWindow = reuseOrCreate(authWindow, {
        url: href,
        title: "Sign in to UPDATED",
        width: 520,
        height: 740,
        slot: "auth",
      });
      return true;
    }

    externalWindow = reuseOrCreate(externalWindow, {
      url: href,
      title: "UPDATED",
      width: 960,
      height: 720,
      slot: "external",
    });
    return true;
  } catch {
    return false;
  }
}
