/** Collapsed companion pill slot (widget shell). */
export const WIDGET_PILL_WIDTH = 180;
export const WIDGET_PILL_HEIGHT = 44;

/** Expanded panel target geometry. */
export const WIDGET_PANEL_WIDTH = 420;
export const WIDGET_PANEL_HEIGHT = 520;

/** Inset from display work-area edges. */
export const WIDGET_INSET = 20;

/** Gap between pill and panel when both visible. */
export const WIDGET_PANEL_GAP = 8;

/** Hold longer than this → dictation; shorter → panel toggle (hold mode only). */
export const WIDGET_HOTKEY_TAP_MS = 220;

export interface WidgetPoint {
  x: number;
  y: number;
}

export interface WidgetDisplayWorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WidgetDisplay {
  id: number;
  workArea: WidgetDisplayWorkArea;
}

export type WidgetPositionStore = Record<string, WidgetPoint>;

export function displayStorageKey(display: WidgetDisplay): string {
  return String(display.id);
}

export function defaultWidgetPosition(display: WidgetDisplay): WidgetPoint {
  const { x: waX, y: waY, width, height } = display.workArea;
  return {
    x: waX + Math.round((width - WIDGET_PILL_WIDTH) / 2),
    y: waY + height - WIDGET_PILL_HEIGHT - WIDGET_INSET,
  };
}

export function clampWidgetPosition(
  x: number,
  y: number,
  display: WidgetDisplay,
  width = WIDGET_PILL_WIDTH,
  height = WIDGET_PILL_HEIGHT,
): WidgetPoint {
  const { x: waX, y: waY, width: waW, height: waH } = display.workArea;
  const maxX = waX + waW - width - WIDGET_INSET;
  const maxY = waY + waH - height - WIDGET_INSET;
  return {
    x: Math.min(maxX, Math.max(waX + WIDGET_INSET, x)),
    y: Math.min(maxY, Math.max(waY + WIDGET_INSET, y)),
  };
}
