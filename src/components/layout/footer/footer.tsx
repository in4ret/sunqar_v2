"use client";

import { useTranslations } from "next-intl";

import styles from "./footer.module.scss";

export function Footer() {
  const currentYear = new Date().getFullYear();
  const t = useTranslations();

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
