"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  type ReportActiveState,
  submitToggleReportActive,
} from "@/app/(protected)/reports/actions";
import { translateActionMessage } from "@/lib/i18n/action-messages";
import { ToggleSwitch, useToast } from "@/ui";

const initialState: ReportActiveState = {
  active: undefined,
  error: null,
  reportId: null,
  success: null,
};

type ReportActiveToggleProps = {
  active: boolean;
  reportId: string;
  reportTitle: string;
};

export function ReportActiveToggle({
  active,
  reportId,
  reportTitle,
}: ReportActiveToggleProps) {
  const [state, formAction, isPending] = useActionState(
    submitToggleReportActive,
    initialState,
  );
  const router = useRouter();
  const t = useTranslations();
  const { showToast } = useToast();
  const isActive = typeof state.active === "boolean" ? state.active : active;

  useEffect(() => {
    if (typeof state.active !== "boolean" || !state.success) {
      return;
    }

    const successMessage = translateActionMessage(t, state.success);

    if (successMessage) {
      showToast({ message: successMessage, status: "success" });
    }
    router.refresh();
  }, [router, showToast, state.active, state.success, t]);

  useEffect(() => {
    const errorMessage = translateActionMessage(t, state.error);

    if (!errorMessage) {
      return;
    }

    showToast({ message: errorMessage, status: "error" });
  }, [showToast, state.error, t]);

  const nextActive = !isActive;
  const label = isActive
    ? t("reports.table.deactivate", { title: reportTitle })
    : t("reports.table.activate", { title: reportTitle });
  const pendingLabel = isActive
    ? t("reports.table.deactivating")
    : t("reports.table.activating");

  return (
    <form action={formAction}>
      <input name="id" type="hidden" value={reportId} />
      <input name="active" type="hidden" value={String(nextActive)} />
      <ToggleSwitch
        aria-label={isPending ? pendingLabel : label}
        checked={isActive}
        disabled={isPending}
      />
    </form>
  );
}
