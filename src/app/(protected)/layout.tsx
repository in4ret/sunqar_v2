import { AppShell } from "@/components/layout";
import { requireAuth } from "@/lib/auth/auth";

type ProtectedLayoutProps = Readonly<{
  children: React.ReactNode;
}>;

export default async function ProtectedLayout({ children }: ProtectedLayoutProps) {
  await requireAuth();

  return <AppShell>{children}</AppShell>;
}
