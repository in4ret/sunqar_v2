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
  const tableLabels = {
    activeSessions: t("users.table.active-sessions"),
    created: t("users.table.created"),
    nameLogin: t("users.table.name-login"),
    role: t("users.table.role"),
    status: t("users.table.status"),
  };

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
        <section className={styles["user-list-card"]}>
          <div className={styles["section-head"]}>
            <h2 className={styles["section-title"]}>{t("users.current-users")}</h2>
            <p className={styles["section-copy"]}>{t("users.accounts-count", { count: allUsers.length })}</p>
          </div>
          <div className={styles["table-shell"]}>
            <table className={styles["user-table"]}>
              <thead>
                <tr>
                  <th>{tableLabels.nameLogin}</th>
                  <th>{tableLabels.role}</th>
                  <th>{tableLabels.status}</th>
                  <th>{tableLabels.activeSessions}</th>
                  <th>{tableLabels.created}</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((user) => (
                  <tr key={user.id}>
                    <td data-label={tableLabels.nameLogin}>
                      <span className={styles["name-login-cell"]}>
                        <span className={styles["display-name"]}>
                          {user.displayName}
                        </span>
                        <span className={styles["login-name"]}>
                          {user.login}
                        </span>
                      </span>
                    </td>
                    <td data-label={tableLabels.role}>
                      {user.role === "admin"
                        ? t("common.roles.admin")
                        : t("common.roles.user")}
                    </td>
                    <td data-label={tableLabels.status}>
                      {user.isActive
                        ? t("common.statuses.active")
                        : t("common.statuses.inactive")}
                    </td>
                    <td data-label={tableLabels.activeSessions}>
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
                    <td data-label={tableLabels.created}>
                      {user.createdAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <CreateUserForm />
      </div>
    </section>
  );
}
