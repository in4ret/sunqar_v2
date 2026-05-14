export const routes = {
  account: "/account",
  aiModels: "/ai_models",
  home: "/",
  login: "/login",
  newReport: "/reports/new",
  reports: "/reports",
  sources: "/sources",
  users: "/users",
} as const;

export function getReportEditRoute(reportId: string) {
  return `${routes.reports}/${reportId}/edit`;
}
