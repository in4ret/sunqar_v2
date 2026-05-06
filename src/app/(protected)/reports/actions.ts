"use server";

import { getTranslations } from "next-intl/server";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/auth";
import { createReport } from "@/lib/reports";

export type CreateReportFormState = {
  error: string | null;
  success: string | null;
};

const reportsPath = "/reports";

function getIsActive(formData: FormData) {
  return formData.get("isActive") === "on";
}

export async function submitCreateReport(
  _previousState: CreateReportFormState,
  formData: FormData,
): Promise<CreateReportFormState> {
  const user = await requireRole("user");
  const t = await getTranslations();
  const result = await createReport({
    active: getIsActive(formData),
    createdBy: user.id,
    description: String(formData.get("description") ?? ""),
    period: String(formData.get("period") ?? ""),
    title: String(formData.get("title") ?? ""),
  });

  if (result.error) {
    return {
      error: t(`errors.${result.error}`),
      success: null,
    };
  }

  revalidatePath(reportsPath);

  return {
    error: null,
    success: t("messages.report-created", { title: result.reportTitle }),
  };
}
