// api/shopify-webhook.js
// ─────────────────────────────────────────────────────────────────────────────
// TONIGHT'S CONNECTION — Shopify Purchase Webhook
//
// This function runs on Vercel every time someone places an order on Shopify.
// It checks if the order contains "Tonight's Connection", then creates a
// Supabase account and sends the customer a magic login link email.
//
// ENVIRONMENT VARIABLES NEEDED IN VERCEL:
//   SUPABASE_URL              → your Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY → from Supabase → Settings → API → service_role key
//   SHOPIFY_WEBHOOK_SECRET    → from Shopify → Settings → Notifications → Webhooks
//   APP_URL                   → your Vercel app URL (e.g. https://your-app.vercel.app)
//
// Note: Use SUPABASE_SERVICE_ROLE_KEY (not the anon key) — this function runs
// on the server and needs admin access to create user accounts.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// ── Supabase admin client (service role — server only, never expose to browser)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const PRODUCT_NAME = "Tonight's Connection";

// ─── VERIFY SHOPIFY WEBHOOK SIGNATURE ────────────────────────────────────────
// Shopify signs every webhook with an HMAC. We verify it to make sure the
// request is really from Shopify and not someone trying to fake a purchase.
function verifyShopifyWebhook(rawBody, hmacHeader) {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    console.error("SHOPIFY_WEBHOOK_SECRET is not set");
    return false;
  }
  const hash = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hmacHeader));
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
export default async function handler(req, res) {
  // Only accept POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── Read raw body (needed for HMAC verification)
  const rawBody = await getRawBody(req);

  // ── Verify the request is genuinely from Shopify
  const hmacHeader = req.headers["x-shopify-hmac-sha256"];
  if (!hmacHeader || !verifyShopifyWebhook(rawBody, hmacHeader)) {
    console.warn("Webhook signature verification failed");
    return res.status(401).json({ error: "Unauthorized" });
  }

  // ── Parse the order payload
  let order;
  try {
    order = JSON.parse(rawBody);
  } catch (err) {
    console.error("Failed to parse webhook body:", err);
    return res.status(400).json({ error: "Invalid JSON" });
  }

  // ── Check if this order contains "Tonight's Connection"
  const lineItems = order.line_items || [];
  const hasTonightsConnection = lineItems.some((item) =>
    item.title?.toLowerCase().includes(PRODUCT_NAME.toLowerCase())
  );

  if (!hasTonightsConnection) {
    // Not our product — acknowledge and move on (Shopify expects a 200)
    console.log(`Order ${order.id} does not contain "${PRODUCT_NAME}" — skipping`);
    return res.status(200).json({ skipped: true });
  }

  // ── Get the customer's email
  const email =
    order.customer?.email ||
    order.email ||
    order.contact_email;

  if (!email) {
    console.error(`Order ${order.id} has no customer email`);
    return res.status(200).json({ error: "No email found on order" });
  }

  console.log(`Processing Tonight's Connection purchase for: ${email}`);

  // ── Check if this user already has an account
  const { data: { users: userList }, error: lookupError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

  const alreadyExists = !lookupError &&
    userList?.some((u) => u.email?.toLowerCase() === email.toLowerCase());

  // ── Create account if it doesn't exist
  // We pre-confirm the email since they already verified it via Shopify checkout.
  if (!alreadyExists) {
    const { error: createError } = await supabase.auth.admin.createUser({
      email,
      email_confirm: true,
    });

    if (createError) {
      console.error(`Failed to create account for ${email}:`, createError.message);
      return res.status(500).json({ error: "Failed to create account" });
    }
    console.log(`Created account for ${email}`);
  } else {
    console.log(`Account already exists for ${email} — sending login link anyway`);
  }

  // ── Send magic link email via signInWithOtp
  //
  // KEY FIX: generateLink() only returns a URL — it does NOT send any email.
  // signInWithOtp() is the correct method: it triggers Supabase to actually
  // send the magic link email to the customer directly.
  //
  // shouldCreateUser: false — account is already created above, this prevents
  // a duplicate creation attempt and ensures the email is sent to existing users.
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: false,
      emailRedirectTo: process.env.APP_URL || "https://your-app.vercel.app",
    },
  });

  if (otpError) {
    console.error(`Failed to send magic link email to ${email}:`, otpError.message);
    return res.status(500).json({ error: "Failed to send login email" });
  }

  console.log(`Magic login link email sent to ${email} ✓`);

  // ── Return 200 so Shopify knows we handled it
  return res.status(200).json({
    success: true,
    message: `Account created and login link email sent to ${email}`,
  });
}

// ─── HELPER: Read raw request body ───────────────────────────────────────────
// We need the raw bytes (not parsed JSON) to verify the Shopify signature
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => { data += chunk; });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

