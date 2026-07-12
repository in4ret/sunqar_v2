"use server";

import { requireRole } from "@/lib/auth/auth";
import {
  type DirectoriesUpdateStartStatus,
  startDirectoriesUpdate,
} from "@/lib/maintenance";

export type StartDirectoriesUpdateResult = {
  status: DirectoriesUpdateStartStatus;
};

export async function submitStartDirectoriesUpdate(): Promise<StartDirectoriesUpdateResult> {
  await requireRole("admin");

  return {
    status: startDirectoriesUpdate(false),
  };
}
