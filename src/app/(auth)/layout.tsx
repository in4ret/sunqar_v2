import { AppShell } from "@/components/layout";

type AuthLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function AuthLayout({ children }: AuthLayoutProps) {
  return <AppShell mainClassName="auth-main">{children}</AppShell>;
}
