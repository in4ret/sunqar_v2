import { getTranslations } from "next-intl/server";
import styles from "./footer.module.scss";

export async function Footer() {
  const currentYear = new Date().getFullYear();
  const t = await getTranslations();

  return (
    <footer className={styles["site-footer"]}>
      <div className={styles["footer-inner"]}>
        <p className={styles["footer-copy"]}>
          © {currentYear} Sunqar. {t("footer.copyright")}
        </p>
      </div>
    </footer>
  );
}
