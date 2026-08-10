export const PANEL_TABS = [
  "chat",
  "history",
  "todos",
  "notes",
  "brain",
] as const;
export type PanelTab = (typeof PANEL_TABS)[number];

export const PANEL_WIDTH = 380;
export const PANEL_HEIGHT = 580;
export const PANEL_GAP = 10;
export const COMPANION_CLEARANCE = 84;
