import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentSession, listActiveSessionsByUserId } from "@/lib/auth/auth";
import { submitTerminateSession } from "./actions";
import styles from "./page.module.scss";

function formatSessionDate(date: Date, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

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

export default async function DashboardPage() {
  const currentSession = await getCurrentSession();
  const user = currentSession?.user ?? null;
  const activeSessions = user ? await listActiveSessionsByUserId(user.id) : [];
  const locale = await getLocale();
  const t = await getTranslations();
  const displayName = user?.displayName ?? user?.login ?? "User";

  return (
    <section className={styles["dashboard-page"]}>
      <div className={styles["hero-panel"]}>
        <p className={styles["eyebrow"]}>{t("dashboard.eyebrow")}</p>
        <h1 className={styles["title"]}>{t("dashboard.title", { name: displayName })}</h1>
        <div className={styles["sessions-block"]}>
          <h2 className={styles["sessions-title"]}>{t("dashboard.sessions-title")}</h2>
          {activeSessions.length > 0 ? (
            <ul className={styles["session-list"]}>
              {activeSessions.map((session, index) => (
                <li className={styles["session-item"]} key={session.id}>
                  <div className={styles["session-heading"]}>
                    <span>{t("dashboard.session-label", { number: index + 1 })}</span>
                    {session.id === currentSession?.sessionId ? (
                      <span className={styles["current-session-badge"]}>
                        {t("dashboard.current-session")}
                      </span>
                    ) : (
                      <form action={submitTerminateSession.bind(null, session.id)}>
                        <button className={styles["terminate-session-button"]} type="submit">
                          {t("dashboard.terminate-session")}
                        </button>
                      </form>
                    )}
                  </div>
                  <dl className={styles["session-details"]}>
                    <div>
                      <dt>{t("dashboard.session-created")}</dt>
                      <dd>{formatSessionDate(session.createdAt, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t("dashboard.session-last-seen")}</dt>
                      <dd>{formatSessionDate(session.lastSeenAt, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t("dashboard.session-expires")}</dt>
                      <dd>{formatSessionDate(session.expiresAt, locale)}</dd>
                    </div>
                    <div>
                      <dt>{t("dashboard.session-ip")}</dt>
                      <dd>{session.ip ?? t("dashboard.session-ip-unavailable")}</dd>
                    </div>
                    <div>
                      <dt>{t("dashboard.session-location")}</dt>
                      <dd>
                        {formatSessionLocation(session) ||
                          t("dashboard.session-location-unavailable")}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles["empty-sessions"]}>{t("dashboard.no-active-sessions")}</p>
          )}
        </div>
      </div>
    </section>
  );
}
