// api/resend-magic-link.js
// ─────────────────────────────────────────────────────────────────────────────
// TONIGHT'S CONNECTION — Resend Magic Link API
//
// Called by the self-service help form on your Shopify website.
// Checks if the email has an account, then sends a fresh magic link.
//
// ENVIRONMENT VARIABLES (already in Vercel from your webhook setup):
//   SUPABASE_URL              → your Supabase project URL
//   SUPABASE_SERVICE_ROLE_KEY → your Supabase service role key
//   APP_URL                   → your Vercel app URL
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // ── Only allow POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // ── CORS headers so your Shopify page can call this
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // ── Handle preflight
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ── Get email from request body
  const { email } = req.body || {};

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "Please enter a valid email address." });
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    // ── Check if this email has an account in Supabase
    const { data: { users }, error: lookupError } =
      await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });

    if (lookupError) {
      console.error("Lookup error:", lookupError.message);
      return res.status(500).json({ error: "Something went wrong. Please try again." });
    }

    const accountExists = users?.some(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    if (!accountExists) {
      // Don't reveal whether the email exists for security —
      // but give a helpful message since this is a paid product
      return res.status(200).json({
        success: false,
        message: "We couldn't find an account with that email address. Please make sure you're using the same email you used at checkout. If you need further help, contact us directly."
      });
    }

    // ── Account found — send a fresh magic link
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: normalizedEmail,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: process.env.APP_URL || "https://your-app.vercel.app",
      },
    });

    if (otpError) {
      console.error("OTP error:", otpError.message);
      return res.status(500).json({ error: "Failed to send the link. Please try again in a few minutes." });
    }

    console.log(`Magic link resent to ${normalizedEmail}`);
    return res.status(200).json({
      success: true,
      message: "Success! Check your email for your access link. It may take a minute or two to arrive. Be sure to check your spam folder."
    });

  } catch (err) {
    console.error("Unexpected error:", err);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
}
