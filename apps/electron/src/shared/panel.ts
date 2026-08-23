export const PANEL_TABS = [
  "chat",
  "search",
  "history",
  "todos",
  "notes",
  "brain",
  "apps",
] as const;
export type PanelTab = (typeof PANEL_TABS)[number];

import {
  WIDGET_INSET,
  WIDGET_PANEL_GAP,
  WIDGET_PANEL_HEIGHT,
  WIDGET_PANEL_WIDTH,
  WIDGET_PILL_HEIGHT,
} from "./widget.js";

/** Expanded widget panel width (Gate 2). */
export const PANEL_WIDTH = WIDGET_PANEL_WIDTH;
export const PANEL_MIN_WIDTH = 340;
export const PANEL_MAX_WIDTH = 640;
export const PANEL_HEIGHT = WIDGET_PANEL_HEIGHT;
export const PANEL_GAP = WIDGET_PANEL_GAP;
/** Room reserved above the bottom-centre pill. */
export const COMPANION_CLEARANCE =
  WIDGET_PILL_HEIGHT + WIDGET_INSET + WIDGET_PANEL_GAP;
