import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const SANDBOX_URL = "https://sandbox.safaricom.co.ke";

async function getMpesaToken(): Promise<string> {
  const key = process.env.MPESA_CONSUMER_KEY;
  const secret = process.env.MPESA_CONSUMER_SECRET;
  if (!key || !secret) throw new Error("M-Pesa credentials not configured");

  const auth = Buffer.from(`${key}:${secret}`).toString("base64");
  const res = await fetch(
    `${SANDBOX_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } },
  );
  if (!res.ok) throw new Error(`M-Pesa auth failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export const initiateStkPush = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z
      .object({
        phone: z.string().min(10).max(15),
        amount: z.number().min(1).max(1000000),
        accountRef: z.string().min(1).max(20),
        userId: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const shortcode = process.env.MPESA_SHORTCODE || "174379";
    const passkey = process.env.MPESA_PASSKEY;
    if (!passkey) throw new Error("M-Pesa passkey not configured");

    const token = await getMpesaToken();
    const timestamp = new Date()
      .toISOString()
      .replace(/[-T:.Z]/g, "")
      .slice(0, 14);
    const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString(
      "base64",
    );

    // Normalize phone: 07xxx → 2547xxx
    let phone = data.phone.replace(/\s+/g, "");
    if (phone.startsWith("0")) phone = "254" + phone.slice(1);
    if (phone.startsWith("+")) phone = phone.slice(1);

    const callbackUrl =
      process.env.MPESA_CALLBACK_URL ||
      `https://project--960a4d58-047e-4efc-b9ce-bbd37bc2d920.lovable.app/api/public/mpesa-callback`;

    const body = {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(data.amount),
      PartyA: phone,
      PartyB: shortcode,
      PhoneNumber: phone,
      CallBackURL: callbackUrl,
      AccountReference: data.accountRef,
      TransactionDesc: `Deposit to Kenya Capital - ${data.accountRef}`,
    };

    const res = await fetch(`${SANDBOX_URL}/mpesa/stkpush/v1/processrequest`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const result = (await res.json()) as Record<string, unknown>;
    if (!res.ok || result.errorCode) {
      throw new Error(
        `STK Push failed: ${result.errorMessage || JSON.stringify(result)}`,
      );
    }

    return {
      success: true,
      checkoutRequestID: result.CheckoutRequestID as string,
      merchantRequestID: result.MerchantRequestID as string,
      responseDescription: result.ResponseDescription as string,
    };
  });
