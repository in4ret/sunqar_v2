import { redirect } from "next/navigation";

import { getCurrentUser } from "@/lib/auth/auth";
import { routes } from "@/lib/routes";

import { LoginPageView } from "./login-page-view/login-page-view";

export default async function LoginPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(routes.home);
  }

  return <LoginPageView />;
}
