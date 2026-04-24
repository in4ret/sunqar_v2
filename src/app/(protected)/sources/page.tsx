import { getTranslations } from "next-intl/server";
import { SourceManager } from "@/components/sources";
import { requireRole } from "@/lib/auth/auth";
import { listSources } from "@/lib/sources/sources";
import styles from "./page.module.scss";

export default async function SourcesPage() {
  await requireRole("admin");

  const t = await getTranslations();
  const allSources = await listSources();

  return (
    <section className={styles["sources-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles["eyebrow"]}>{t("sources.eyebrow")}</p>
          <h1 className={styles["title"]}>{t("sources.title")}</h1>
          <p className={styles["description"]}>{t("sources.description")}</p>
        </div>
      </div>
      <SourceManager sources={allSources.map(({ id, name }) => ({ id, name }))} />
    </section>
  );
}
