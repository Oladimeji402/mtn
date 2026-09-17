import { Settings } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";

/** Placeholder — the per-purchase data cap that used to live here was removed at the
 *  client's request. Nothing else is configurable yet. */
export function AdminSettingsForm() {
  return (
    <EmptyState
      icon={Settings}
      title="Nothing to configure yet"
      description="Platform settings will appear here as they're added."
    />
  );
}
