"use server";

import { redirect } from "next/navigation";
import { logout } from "@/lib/auth/auth";

export async function submitLogout() {
  await logout();
  redirect("/login");
}
