import "server-only";

import { supabaseAdmin } from "./db/admin";
import { logError } from "@/lib/logger";

export type RateLimitOpts = {
  identifier: string;
  action: string;
  maxAttempts: number;
  windowMinutes: number;
};

/**
 * Returns true if the request is allowed. Falls open (returns true) on DB
 * errors so that a Supabase outage doesn't take the whole site down — admin
 * routes get a separate, fail-closed enforcement layer.
 */
export async function checkRateLimit({
  identifier,
  action,
  maxAttempts,
  windowMinutes,
}: RateLimitOpts): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      p_identifier: identifier,
      p_action: action,
      p_max_attempts: maxAttempts,
      p_window_minutes: windowMinutes,
    });
    if (error) {
      logError(error, { caller: "rateLimit" });
      return true;
    }
    return data === true;
  } catch (err) {
    logError(err, { caller: "rateLimit" });
    return true;
  }
}

/** Same call but fail-closed — used by login/download where allow-all on error
 * would defeat the purpose. */
export async function checkRateLimitStrict(opts: RateLimitOpts): Promise<boolean> {
  try {
    const { data, error } = await supabaseAdmin.rpc("check_rate_limit", {
      p_identifier: opts.identifier,
      p_action: opts.action,
      p_max_attempts: opts.maxAttempts,
      p_window_minutes: opts.windowMinutes,
    });
    if (error) {
      logError(error, { caller: "rateLimit:strict" });
      return false;
    }
    return data === true;
  } catch (err) {
    logError(err, { caller: "rateLimit:strict" });
    return false;
  }
}
