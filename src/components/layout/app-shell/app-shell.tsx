import { Footer } from "../footer/footer";
import { Header } from "../header/header";

type AppShellProps = Readonly<{
  children: React.ReactNode;
  mainClassName?: string;
}>;

export async function AppShell({ children, mainClassName = "app-main" }: AppShellProps) {
  return (
    <div className="app-shell">
      <Header />
      <main className={mainClassName}>{children}</main>
      <Footer />
    </div>
  );
}
