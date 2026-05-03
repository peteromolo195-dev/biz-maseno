import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const Route = createFileRoute("/api/public/mpesa-callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            Body?: {
              stkCallback?: {
                MerchantRequestID?: string;
                CheckoutRequestID?: string;
                ResultCode?: number;
                ResultDesc?: string;
                CallbackMetadata?: {
                  Item?: Array<{ Name: string; Value: unknown }>;
                };
              };
            };
          };

          const cb = body?.Body?.stkCallback;
          if (!cb) return new Response("ok");

          const resultCode = cb.ResultCode;
          const items = cb.CallbackMetadata?.Item ?? [];
          const mpesaCode = items.find(
            (i) => i.Name === "MpesaReceiptNumber",
          )?.Value as string | undefined;
          const amount = items.find((i) => i.Name === "Amount")?.Value as
            | number
            | undefined;
          const phone = items.find((i) => i.Name === "PhoneNumber")?.Value as
            | string
            | undefined;

          // Log the callback
          await supabaseAdmin.from("audit_log").insert({
            action: "mpesa.callback",
            entity: "transaction",
            entity_id: cb.CheckoutRequestID ?? null,
            details: {
              resultCode,
              resultDesc: cb.ResultDesc,
              mpesaCode,
              amount,
              phone,
            } as Record<string, unknown>,
          });

          // If successful payment, find pending deposit with matching reference and approve
          if (resultCode === 0 && mpesaCode) {
            const { data: txs } = await supabaseAdmin
              .from("transactions")
              .select("id, user_id")
              .eq("status", "pending")
              .eq("type", "deposit")
              .ilike("reference", `%${cb.CheckoutRequestID}%`)
              .limit(1);

            if (txs && txs.length > 0) {
              await supabaseAdmin
                .from("transactions")
                .update({
                  status: "approved",
                  reference: mpesaCode,
                  approved_at: new Date().toISOString(),
                  description: `M-Pesa auto-confirmed: ${mpesaCode}`,
                })
                .eq("id", txs[0].id);
            }
          }

          return new Response("ok");
        } catch (e) {
          console.error("M-Pesa callback error:", e);
          return new Response("error", { status: 500 });
        }
      },
    },
  },
});
