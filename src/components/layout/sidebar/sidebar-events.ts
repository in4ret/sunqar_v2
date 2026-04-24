export const SIDEBAR_TOGGLE_EVENT = "sidebar-toggle-request";
export const SIDEBAR_STATE_EVENT = "sidebar-state-change";

export type SidebarStateDetail = {
  isCollapsed: boolean;
  isOpen: boolean;
};
