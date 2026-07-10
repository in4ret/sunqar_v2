export const routes = {
  account: "/account",
  aiModels: "/ai_models",
  comments: "/comments",
  commentsChart: "/comments/chart",
  commentsText: "/comments/text",
  commentsUpload: "/comments/upload",
  home: "/",
  login: "/login",
  news: "/news",
  newsChart: "/news/chart",
  newsText: "/news/text",
  taskApi: "/api/tasks",
  taskStreamApi: "/api/tasks/stream",
  tasks: "/tasks",
  newReport: "/reports/new",
  reports: "/reports",
  users: "/users",
} as const;

export type CommentsTab = "chart" | "text" | "upload";
export type NewsTab = "chart" | "text";

export function getCommentsTabRoute(tab: CommentsTab) {
  if (tab === "chart") {
    return routes.commentsChart;
  }

  if (tab === "text") {
    return routes.commentsText;
  }

  return routes.commentsUpload;
}

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
