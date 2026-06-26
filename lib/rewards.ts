import { supabase } from "./supabase";
import { SHARE_URL } from "./share";
import type { Severity } from "./supabase";

// Reporter rewards: $1 per APPROVED report, accruing into a withdrawable
// balance. Withdrawal opens at $5 and is fulfilled manually via a prefilled
// email to Coco Wallet (no payment API). A report only counts once an admin
// marks it approved in the Supabase dashboard.

export const MIN_WITHDRAWAL = 5; // dollars
const PAYOUT_EMAIL = "kevin@cocowallet.app";

export interface MyReport {
  id: string;
  place: string | null;
  severity: Severity;
  created_at: string;
  approved: boolean;
  paid: boolean;
}

// The current reporter's own reports. RLS (reports_self_read) restricts this to
// rows where reporter_id = auth.uid(), so it never returns another user's data.
// Returns pending (not yet approved) rows too, so "Mis reportes" can show them.
export async function fetchMyReports(): Promise<MyReport[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("id,place,severity,approved,paid,created_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    return [];
  }
  return (data ?? []) as MyReport[];
}

// Attribute a just-submitted (anonymous) report to the logged-in reporter.
// The claim_report RPC only stamps reporter_id when the row is unclaimed, so a
// report can't be stolen or double-claimed.
export async function claimReport(reportId: string): Promise<void> {
  const { error } = await supabase.rpc("claim_report", {
    p_report_id: reportId,
  });
  if (error) throw error;
}

// Withdrawable balance in dollars: $1 per approved, unpaid report.
export function computeBalance(rows: MyReport[]): number {
  return rows.filter((r) => r.approved && !r.paid).length;
}

// Build a prefilled mailto for withdrawal. Lists the approved/unpaid report
// links and a template for the reporter to fill in their WhatsApp + wallet.
export function buildPayoutMailto(rows: MyReport[]): string {
  const eligible = rows.filter((r) => r.approved && !r.paid);
  const amount = eligible.length;
  const subject = `Pago por ${amount} reportes`;
  const links = eligible.map((r) => `- ${SHARE_URL}/edificio/${r.id}`).join("\n");
  const body = [
    `Hola, quiero retirar $${amount} por mis ${amount} reportes aprobados.`,
    ``,
    `Mis reportes:`,
    links,
    ``,
    `--- Completa estos datos ---`,
    `Mi número de WhatsApp: `,
    `Mi dirección de Coco Wallet: `,
    ``,
    `Si aún no tienes Coco Wallet, descárgala aquí: https://cocowallet.app`,
  ].join("\n");
  return `mailto:${PAYOUT_EMAIL}?subject=${encodeURIComponent(
    subject
  )}&body=${encodeURIComponent(body)}`;
}
