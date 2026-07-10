import "server-only";
import { createHash, randomInt } from "crypto";
import { supabaseAdmin } from "@/lib/db/admin";
import { resendClient, marketingFromAddress, siteUrl } from "@/lib/marketing";
import { logError } from "@/lib/logger";

/**
 * Email verification for wallet "login" — a 6-digit one-time code, not a
 * password. Codes are hashed at rest (sha256), expire in 10 minutes, and are
 * single-use with a 5-attempt limit per code.
 */

const CODE_TTL_MINUTES = 10;
const MAX_ATTEMPTS = 5;

const hashCode = (code: string): string => createHash("sha256").update(code).digest("hex");

function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Invalidate any outstanding codes for this wallet+email, issue a fresh one. */
export async function createEmailOtp(walletId: string, email: string): Promise<string> {
  await supabaseAdmin
    .from("wallet_email_otps")
    .delete()
    .eq("wallet_id", walletId)
    .eq("email", email)
    .is("consumed_at", null);

  const code = generateCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000).toISOString();

  const { error } = await supabaseAdmin.from("wallet_email_otps").insert({
    wallet_id: walletId,
    email,
    code_hash: hashCode(code),
    expires_at: expiresAt,
  });
  if (error) throw new Error("otp_create_failed");

  return code;
}

export type VerifyOtpResult = "ok" | "invalid_code" | "expired" | "too_many_attempts";

/** Verify a submitted code against the latest outstanding OTP for wallet+email. */
export async function verifyEmailOtp(
  walletId: string,
  email: string,
  code: string,
): Promise<VerifyOtpResult> {
  const { data: otp, error } = await supabaseAdmin
    .from("wallet_email_otps")
    .select("id, code_hash, attempts, expires_at, consumed_at")
    .eq("wallet_id", walletId)
    .eq("email", email)
    .is("consumed_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !otp) return "invalid_code";
  if (new Date(otp.expires_at).getTime() < Date.now()) return "expired";
  if (otp.attempts >= MAX_ATTEMPTS) return "too_many_attempts";

  if (hashCode(code) !== otp.code_hash) {
    await supabaseAdmin
      .from("wallet_email_otps")
      .update({ attempts: otp.attempts + 1 })
      .eq("id", otp.id);
    return "invalid_code";
  }

  await supabaseAdmin
    .from("wallet_email_otps")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", otp.id);
  return "ok";
}

/** Send the 6-digit login code by email. Returns false if Resend isn't configured. */
export async function sendWalletOtpEmail(email: string, code: string): Promise<boolean> {
  const resend = resendClient();
  if (!resend) return false;

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background-color:#090f0e;color:#dde4e2;font-family:Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#090f0e;">
  <tr><td align="center" style="padding:32px 16px;">
    <table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;">
      <tr><td style="padding-bottom:24px;text-align:center;">
        <span style="font-size:20px;font-weight:700;letter-spacing:4px;color:#62f3e4;">NTV VAULT</span>
      </td></tr>
      <tr><td style="background-color:#1a2120;border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:32px;text-align:center;">
        <p style="margin:0 0 12px;font-size:14px;color:#bbcac6;">Your Nano Tech Games login code</p>
        <p style="margin:0 0 16px;font-size:32px;font-weight:700;letter-spacing:8px;color:#62f3e4;">${code}</p>
        <p style="margin:0;font-size:12px;color:#8a9995;">Expires in ${CODE_TTL_MINUTES} minutes. If you didn't request this, ignore this email.</p>
      </td></tr>
      <tr><td style="padding-top:24px;text-align:center;font-size:11px;line-height:1.7;color:#8a9995;">
        © ${new Date().getFullYear()} Nano Tech Productions · <a href="${siteUrl()}" style="color:#62f3e4;text-decoration:none;">nanotechvibe.com</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

  try {
    const { error } = await resend.emails.send({
      from: marketingFromAddress(),
      to: email,
      subject: `${code} is your Nano Tech Games login code`,
      html,
      text: `Your Nano Tech Games login code is ${code}. It expires in ${CODE_TTL_MINUTES} minutes.`,
    });
    if (error) {
      logError(error, { caller: "walletAuth:sendOtp" });
      return false;
    }
    return true;
  } catch (err) {
    logError(err, { caller: "walletAuth:sendOtp throw" });
    return false;
  }
}
