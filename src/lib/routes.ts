export const routes = {
  account: "/account",
  aiModels: "/ai_models",
  comments: "/comments",
  home: "/",
  login: "/login",
  news: "/news",
  newsChart: "/news/chart",
  newsText: "/news/text",
  posts: "/posts",
  taskApi: "/api/tasks",
  taskStreamApi: "/api/tasks/stream",
  tasks: "/tasks",
  newReport: "/reports/new",
  reports: "/reports",
  sources: "/sources",
  users: "/users",
} as const;

export type NewsTab = "chart" | "text";

export function getNewsTabRoute(tab: NewsTab) {
  return tab === "chart" ? routes.newsChart : routes.newsText;
}

export function getReportEditRoute(reportId: string) {
  return `${routes.reports}/${reportId}/edit`;
}

export function getTaskDownloadRoute(taskId: string) {
  return `${routes.tasks}/${taskId}`;
}

export function getTaskRoute(taskId: string) {
  return `${routes.taskApi}/${taskId}`;
}
