import { getTranslations } from "next-intl/server";
import { CreateUserForm } from "@/components/users";
import { listUsers, requireRole } from "@/lib/auth/auth";
import styles from "./page.module.css";

export default async function UsersPage() {
  await requireRole("admin");

  const t = await getTranslations();
  const allUsers = await listUsers();

  return (
    <section className={styles["users-page"]}>
      <div className={styles["page-header"]}>
        <div>
          <p className={styles["eyebrow"]}>{t("users.eyebrow")}</p>
          <h1 className={styles["title"]}>{t("users.title")}</h1>
          <p className={styles["description"]}>{t("users.description")}</p>
        </div>
      </div>
      <div className={styles["content-grid"]}>
        <CreateUserForm />
        <section className={styles["user-list-card"]}>
          <div className={styles["section-head"]}>
            <h2 className={styles["section-title"]}>{t("users.current-users")}</h2>
            <p className={styles["section-copy"]}>{t("users.accounts-count", { count: allUsers.length })}</p>
          </div>
          <div className={styles["table-shell"]}>
            <table className={styles["user-table"]}>
              <thead>
                <tr>
                  <th>{t("users.table.display-name")}</th>
                  <th>{t("users.table.login")}</th>
                  <th>{t("users.table.role")}</th>
                  <th>{t("users.table.status")}</th>
                  <th>{t("users.table.created")}</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((user) => (
                  <tr key={user.id}>
                    <td>{user.displayName}</td>
                    <td>{user.login}</td>
                    <td>{user.role === "admin" ? t("common.roles.admin") : t("common.roles.user")}</td>
                    <td>
                      {user.isActive
                        ? t("common.statuses.active")
                        : t("common.statuses.inactive")}
                    </td>
                    <td>{user.createdAt.toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}
