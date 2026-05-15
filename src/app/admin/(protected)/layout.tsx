import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { SentryErrorBoundary } from "@/components/ui/SentryErrorBoundary";

export default async function ProtectedAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await isAdmin())) redirect("/admin/login");

  return (
    <AdminShell>
      <SentryErrorBoundary>{children}</SentryErrorBoundary>
    </AdminShell>
  );
}
