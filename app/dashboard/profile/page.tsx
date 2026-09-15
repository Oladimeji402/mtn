import type { Metadata } from "next";
import { PageHeader } from "@/components/shared/page-header";
import { AccountStatusBadge } from "@/components/shared/status-badge";
import { ProfileInfoForm } from "@/components/profile/profile-info-form";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { formatDate } from "@/lib/format";
import { getCurrentUser } from "@/lib/services/users";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();

  return (
    <div className="space-y-6">
      <PageHeader title="Profile" description="Manage your personal information and security." />

      <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
        <div>
          <p className="font-medium">Personal information</p>
          <p className="text-sm text-muted-foreground">Your username and email address.</p>
        </div>
        <ProfileInfoForm user={user} />
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
        <div>
          <p className="font-medium">Security</p>
          <p className="text-sm text-muted-foreground">Change your account password.</p>
        </div>
        <ChangePasswordForm email={user.email} />
      </section>

      <section className="space-y-4 rounded-xl border bg-card p-5 sm:p-6">
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
