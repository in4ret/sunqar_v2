import { CreateReportForm } from "@/components/reports";
import { requireRole } from "@/lib/auth/auth";
import styles from "./page.module.scss";

export default async function NewReportPage() {
  await requireRole("user");

  return (
    <section className={styles["new-report-page"]}>
      <CreateReportForm />
    </section>
  );
}
