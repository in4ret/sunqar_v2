"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logout, terminateActiveSession } from "@/lib/auth/auth";
import { routes } from "@/lib/routes";

export async function submitLogout() {
  await logout();
  redirect(routes.login);
}

export async function submitTerminateSession(sessionId: string) {
  await terminateActiveSession(sessionId);
  revalidatePath(routes.account);
}
