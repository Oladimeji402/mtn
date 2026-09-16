import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AccountStatusBadge } from "@/components/shared/status-badge";
import { ProfileInfoForm } from "@/components/profile/profile-info-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/services/users";
import { cn, screenPanelClass } from "@/lib/utils";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-0 sm:space-y-6">
      <div className="mb-3 sm:mb-0">
        <PageHeader title="Profile" />
      </div>

      <section className={cn("space-y-4 border-t sm:border", screenPanelClass)}>
        <p className="font-medium">Personal information</p>
        <ProfileInfoForm user={user} />
      </section>

      <section className={cn("space-y-4 border-t sm:border", screenPanelClass)}>
        <p className="font-medium">Security</p>
        <ChangePasswordForm email={user.email} />
      </section>

      <section className={cn("space-y-4 border-t sm:border", screenPanelClass)}>
        <p className="font-medium">Account</p>
        <div className="divide-y">
          <div className="flex items-center justify-between py-3 text-sm">
            <span className="text-muted-foreground">Status</span>
            <AccountStatusBadge status={user.status} />
          </div>
          <div className="flex items-center justify-between py-3 text-sm">
            <span className="text-muted-foreground">Email verified</span>
            <span className="font-medium">{user.emailVerified ? "Yes" : "No"}</span>
          </div>
          <div className="flex items-center justify-between py-3 text-sm">
            <span className="text-muted-foreground">Member since</span>
            <span className="font-medium">{formatDate(user.createdAt)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
