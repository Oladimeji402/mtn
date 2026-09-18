/**
 * Hand-written to match supabase/migrations/0001_init.sql + 0002_auth_helpers.sql.
 * Once the Supabase CLI is linked to the project, regenerate with:
 *   supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts
 * and this file (and this comment) can be replaced wholesale.
 *
 * Row types are accurate. Insert/Update are intentionally permissive (Partial<Row>) —
 * the real write boundary is Row Level Security and which client (anon-scoped vs
 * service-role) a given code path uses, not the TypeScript types. See
 * supabase/migrations/0001_init.sql for what each role can actually write.
 */

export type AccountStatus = "active" | "disabled";
export type TransactionStatus = "pending" | "processing" | "successful" | "failed" | "refunded";
export type WalletTxType = "funding" | "airtime" | "data" | "refund" | "adjustment";
export type WalletTxDirection = "credit" | "debit";
export type PurchaseType = "airtime" | "data";
export type PlanCategory = "daily" | "weekly" | "monthly";
export type AdminRole = "owner" | "admin" | "support";
export type NotificationTypeDb =
  | "airtime_success"
  | "airtime_failed"
  | "data_success"
  | "data_failed"
  | "wallet_funded"
  | "wallet_funding_failed"
  | "daily_limit_warning"
  | "monthly_limit_warning"
  | "security"
  | "vtu_balance_low"
  | "sme_balance_low"
  | "plan_price_drift";

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Relationships extends readonly Relationship[] = []> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: Relationships;
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<{
        id: string;
        username: string;
        email: string;
        phone: string | null;
        status: AccountStatus;
        created_at: string;
      }>;
      wallets: Table<{
        user_id: string;
        balance: number;
        currency: string;
        updated_at: string;
      }>;
      wallet_ledger: Table<{
        id: string;
        reference: string;
        user_id: string;
        type: WalletTxType;
        direction: WalletTxDirection;
        amount: number;
        balance_before: number;
        balance_after: number;
        status: TransactionStatus;
        description: string;
        related_purchase_id: string | null;
        created_at: string;
      }>;
      purchases: Table<
        {
          id: string;
          reference: string;
          user_id: string;
          type: PurchaseType;
          network: string;
          phone_number: string;
          amount: number;
          data_plan_id: string | null;
          status: TransactionStatus;
          status_message: string | null;
          wallet_balance_before: number;
          wallet_balance_after: number;
          provider_reference: string | null;
          failure_reason: string | null;
          created_at: string;
          completed_at: string | null;
        },
        [
          {
            foreignKeyName: "purchases_data_plan_id_fkey";
            columns: ["data_plan_id"];
            isOneToOne: false;
            referencedRelation: "data_plans";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "purchases_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ]
      >;
      data_plans: Table<{
        id: string;
        network: string;
        size: string;
        size_in_mb: number;
        validity_days: number;
        price: number;
        category: PlanCategory;
        popular: boolean;
        active: boolean;
        vtu_variation_id: string | null;
        provider: string;
        sme_size_code: string | null;
        reseller_cost: number | null;
      }>;
      notifications: Table<{
        id: string;
        user_id: string;
        type: NotificationTypeDb;
        title: string;
        message: string;
        read: boolean;
        created_at: string;
      }>;
      platform_settings: Table<{
        id: boolean;
        minimum_funding_amount: number;
        updated_by: string | null;
        updated_at: string;
      }>;
      admin_users: Table<{
        user_id: string;
        role: AdminRole;
        created_at: string;
      }>;
      payment_events: Table<{
        id: string;
        provider: string;
        event_reference: string;
        payload: Record<string, unknown>;
        processed_at: string | null;
        created_at: string;
      }>;
      audit_log: Table<{
        id: string;
        actor_id: string | null;
        actor_type: string;
        action: string;
        entity_type: string;
        entity_id: string | null;
        metadata: Record<string, unknown> | null;
        created_at: string;
      }>;
      vtu_auth_state: Table<{
        id: boolean;
        token: string | null;
        expires_at: string | null;
        updated_at: string;
      }>;
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      fn_resolve_login_email: {
        Args: { p_identifier: string };
        Returns: string | null;
      };
      fn_create_purchase: {
        Args: {
          p_type: PurchaseType;
          p_network: string;
          p_phone_number: string;
          p_amount: number;
          p_data_plan_id: string | null;
          p_reference: string;
        };
        Returns: Database["public"]["Tables"]["purchases"]["Row"];
      };
      fn_finalize_purchase: {
        Args: {
          p_purchase_id: string;
          p_status: TransactionStatus;
          p_provider_reference: string | null;
          p_failure_reason: string | null;
        };
        Returns: Database["public"]["Tables"]["purchases"]["Row"];
      };
      fn_credit_wallet_from_payment: {
        Args: {
          p_user_id: string;
          p_amount: number;
          p_reference: string;
          p_description: string;
        };
        Returns: Database["public"]["Tables"]["wallets"]["Row"];
      };
      fn_get_usage: {
        Args: { p_user_id?: string };
        Returns: {
          daily_used_mb: number;
          monthly_used_mb: number;
        }[];
      };
      fn_check_rate_limit: {
        Args: { p_action: string; p_max_attempts: number; p_window_seconds: number };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
