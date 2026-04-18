import { getTranslations } from "next-intl/server";
import { CreateUserForm } from "@/components/users";
import { listUsersWithActiveSessions, requireRole } from "@/lib/auth/auth";
import styles from "./page.module.scss";

function formatSessionLocation(session: {
  ipGeo: {
    country: string | null;
    region: string | null;
    city: string | null;
  } | null;
}) {
  return [session.ipGeo?.country, session.ipGeo?.region, session.ipGeo?.city]
    .filter(Boolean)
    .join(", ");
}

export default async function UsersPage() {
  await requireRole("admin");

  const t = await getTranslations();
  const allUsers = await listUsersWithActiveSessions();

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
                  <th>{t("users.table.active-sessions")}</th>
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
                    <td>
                      {user.activeSessions.length > 0 ? (
                        <ul className={styles["session-list"]}>
                          {user.activeSessions.map((session) => (
                            <li className={styles["session-item"]} key={session.id}>
                              <span className={styles["session-ip"]}>
                                {session.ip ?? t("users.session-ip-unavailable")}
                              </span>
                              <span className={styles["session-location"]}>
                                {formatSessionLocation(session) ||
                                  t("users.session-location-unavailable")}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className={styles["empty-sessions"]}>
                          {t("users.no-active-sessions")}
                        </span>
                      )}
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
