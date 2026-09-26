import "server-only";
import { getCurrentAdmin } from "@/lib/services/admin";

/**
 * Test plans let an admin buy a small real order end to end (website -> gateway -> SIM) without
 * customers ever seeing it. A plan whose id ends in "-test" is hidden from listings and refused
 * at purchase unless ENABLE_TEST_PLANS=1 is set (never in production) AND the buyer is an admin.
 * The plan row itself must be active, because fn_create_purchase only sells active plans.
 */
export const isTestPlanId = (id: string) => id.endsWith("-test");

export async function canUseTestPlans(): Promise<boolean> {
  if (process.env.ENABLE_TEST_PLANS !== "1") return false;
  return getCurrentAdmin().then(
    () => true,
    () => false,
  );
}
