#!/usr/bin/env node
// Verify DNS / TLS posture for nanotechvibe.com.
//
// Run with:
//   node scripts/verify-dns-security.mjs
//   node scripts/verify-dns-security.mjs --domain example.com
//
// No external deps — uses node:dns/promises and the built-in fetch.
//
// Each check returns { name, status: "pass"|"fail"|"warn", detail }.
// Exit code is the number of failed checks (0 = clean).

import dns from "node:dns/promises";
import { setTimeout as sleep } from "node:timers/promises";

const args = process.argv.slice(2);
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

const DOMAIN = arg("domain", "nanotechvibe.com");
const SECURITY_EMAIL = `security@${DOMAIN}`;
const TIMEOUT_MS = 10_000;

const fmt = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};
const tty = process.stdout.isTTY;
const c = (color, s) => (tty ? `${fmt[color]}${s}${fmt.reset}` : s);

const ICON = { pass: "✓", fail: "✗", warn: "!" };
const COLOR = { pass: "green", fail: "red", warn: "yellow" };

function withTimeout(p, ms = TIMEOUT_MS, label = "operation") {
  return Promise.race([
    p,
    sleep(ms).then(() => {
      throw new Error(`${label} timed out after ${ms}ms`);
    }),
  ]);
}

async function checkDnssec() {
  // Cloudflare DoH gives us the AD (Authenticated Data) flag, which is the
  // cleanest signal that the resolver verified DNSSEC for the zone.
  try {
    const res = await withTimeout(
      fetch(`https://cloudflare-dns.com/dns-query?name=${DOMAIN}&type=DS`, {
        headers: { Accept: "application/dns-json" },
      }),
      TIMEOUT_MS,
      "DNSSEC DS lookup",
    );
    const json = await res.json();
    const hasDs = Array.isArray(json.Answer) && json.Answer.length > 0;
    if (!hasDs) {
      return {
        name: "DNSSEC active",
        status: "fail",
        detail: "No DS record published at registrar — DNSSEC not enabled.",
      };
    }
    const aRes = await withTimeout(
      fetch(`https://cloudflare-dns.com/dns-query?name=${DOMAIN}&type=A`, {
        headers: { Accept: "application/dns-json" },
      }),
      TIMEOUT_MS,
      "DNSSEC AD lookup",
    );
    const aJson = await aRes.json();
    if (aJson.AD === true) {
      return {
        name: "DNSSEC active",
        status: "pass",
        detail: `DS record present and resolver returned AD=1 for A query.`,
      };
    }
    return {
      name: "DNSSEC active",
      status: "warn",
      detail: "DS record present but resolver did not authenticate (AD=0). Re-check DS at registrar.",
    };
  } catch (err) {
    return { name: "DNSSEC active", status: "fail", detail: err.message };
  }
}

async function checkHttpsRedirect() {
  try {
    // Use manual redirect mode so we observe the 301/308 itself.
    const res = await withTimeout(
      fetch(`http://${DOMAIN}/`, {
        method: "HEAD",
        redirect: "manual",
      }),
      TIMEOUT_MS,
      "HTTP redirect probe",
    );
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc?.startsWith("https://")) {
      return {
        name: "HTTPS redirect",
        status: "pass",
        detail: `${res.status} → ${loc}`,
      };
    }
    return {
      name: "HTTPS redirect",
      status: "fail",
      detail: `Expected 301/308 to https://; got ${res.status}${loc ? ` → ${loc}` : ""}`,
    };
  } catch (err) {
    return { name: "HTTPS redirect", status: "fail", detail: err.message };
  }
}

async function checkHsts() {
  try {
    const res = await withTimeout(
      fetch(`https://${DOMAIN}/`, { method: "HEAD" }),
      TIMEOUT_MS,
      "HSTS probe",
    );
    const hsts = res.headers.get("strict-transport-security");
    if (!hsts) {
      return {
        name: "HSTS header",
        status: "fail",
        detail: "Strict-Transport-Security header not present.",
      };
    }
    const lower = hsts.toLowerCase();
    const maxAgeMatch = lower.match(/max-age=(\d+)/);
    const maxAge = maxAgeMatch ? Number(maxAgeMatch[1]) : 0;
    const checks = [];
    if (maxAge < 31_536_000) checks.push(`max-age=${maxAge} (need ≥ 31536000)`);
    if (!lower.includes("includesubdomains")) checks.push("missing includeSubDomains");
    if (!lower.includes("preload")) checks.push("missing preload");
    if (checks.length === 0) {
      return { name: "HSTS header", status: "pass", detail: hsts };
    }
    return {
      name: "HSTS header",
      status: "warn",
      detail: `${hsts} — ${checks.join(", ")}`,
    };
  } catch (err) {
    return { name: "HSTS header", status: "fail", detail: err.message };
  }
}

async function checkDanglingSubdomains() {
  // Without API access we can only spot-check well-known names. The full
  // audit lives in audit-subdomains.mjs (Cloudflare API).
  const candidates = [
    "www",
    "admin",
    "api",
    "assets",
    "cdn",
    "blog",
    "shop",
    "mail",
    "dev",
    "staging",
    "app",
  ];
  const dangling = [];
  await Promise.all(
    candidates.map(async (sub) => {
      const fqdn = `${sub}.${DOMAIN}`;
      try {
        const cnames = await dns.resolveCname(fqdn).catch(() => []);
        if (cnames.length === 0) return;
        for (const target of cnames) {
          try {
            await dns.resolve(target);
          } catch {
            dangling.push({ host: fqdn, target });
          }
        }
      } catch {
        // ignore — name doesn't exist
      }
    }),
  );
  if (dangling.length === 0) {
    return {
      name: "No dangling subdomains (spot-check)",
      status: "pass",
      detail: `Probed ${candidates.length} common names; all CNAMEs resolve.`,
    };
  }
  return {
    name: "No dangling subdomains (spot-check)",
    status: "fail",
    detail: dangling
      .map((d) => `${d.host} → ${d.target} (target does not resolve)`)
      .join("; "),
  };
}

async function checkCaa() {
  try {
    const records = await dns.resolveCaa(DOMAIN).catch(() => []);
    if (records.length === 0) {
      return {
        name: "CAA records set",
        status: "fail",
        detail: "No CAA records published. Add issue / issuewild / iodef in Cloudflare.",
      };
    }
    const flat = records.map((r) => {
      if (r.issue) return `issue=${r.issue}`;
      if (r.issuewild) return `issuewild=${r.issuewild}`;
      if (r.iodef) return `iodef=${r.iodef}`;
      return JSON.stringify(r);
    });
    const issuers = records.filter((r) => r.issue).map((r) => r.issue);
    const hasLetsEncrypt = issuers.some((i) => i.includes("letsencrypt.org"));
    const hasIodef = records.some((r) => r.iodef);
    const warnings = [];
    if (!hasLetsEncrypt) warnings.push("no letsencrypt.org issuer");
    if (!hasIodef) warnings.push("no iodef contact");
    return {
      name: "CAA records set",
      status: warnings.length === 0 ? "pass" : "warn",
      detail: `${flat.join(" | ")}${warnings.length ? ` — ${warnings.join(", ")}` : ""}`,
    };
  } catch (err) {
    return { name: "CAA records set", status: "fail", detail: err.message };
  }
}

async function checkSpf() {
  try {
    const txts = await dns.resolveTxt(DOMAIN).catch(() => []);
    const flat = txts.map((parts) => parts.join(""));
    const spf = flat.find((s) => s.toLowerCase().startsWith("v=spf1"));
    if (!spf) {
      return {
        name: "SPF record published",
        status: "warn",
        detail: "No SPF TXT record. Add v=spf1 include:_spf.google.com ~all",
      };
    }
    return { name: "SPF record published", status: "pass", detail: spf };
  } catch (err) {
    return { name: "SPF record published", status: "fail", detail: err.message };
  }
}

async function checkDmarc() {
  try {
    const txts = await dns.resolveTxt(`_dmarc.${DOMAIN}`).catch(() => []);
    const flat = txts.map((parts) => parts.join(""));
    const dmarc = flat.find((s) => s.toLowerCase().startsWith("v=dmarc1"));
    if (!dmarc) {
      return {
        name: "DMARC record published",
        status: "warn",
        detail: `No _dmarc.${DOMAIN} TXT record.`,
      };
    }
    return { name: "DMARC record published", status: "pass", detail: dmarc };
  } catch (err) {
    return { name: "DMARC record published", status: "fail", detail: err.message };
  }
}

function summarize(results) {
  const counts = { pass: 0, warn: 0, fail: 0 };
  for (const r of results) counts[r.status]++;
  const total = results.length;
  const score = Math.round(((counts.pass + counts.warn * 0.5) / total) * 100);
  return { counts, total, score };
}

async function main() {
  console.log(c("bold", `\nDNS security verification — ${DOMAIN}\n`));
  console.log(c("dim", `Security contact: ${SECURITY_EMAIL}\n`));

  const checks = [
    checkDnssec(),
    checkHttpsRedirect(),
    checkHsts(),
    checkCaa(),
    checkDanglingSubdomains(),
    checkSpf(),
    checkDmarc(),
  ];

  const results = await Promise.all(checks);

  for (const r of results) {
    const icon = ICON[r.status];
    console.log(`${c(COLOR[r.status], icon)} ${c("bold", r.name)}`);
    console.log(`  ${c("dim", r.detail)}`);
  }

  const { counts, total, score } = summarize(results);
  console.log("");
  console.log(
    c(
      "bold",
      `Score: ${score}/100  (pass=${counts.pass} warn=${counts.warn} fail=${counts.fail} of ${total})`,
    ),
  );

  if (counts.fail > 0) {
    console.log(c("red", "\nFailures need fixing before this is production-ready."));
    process.exit(counts.fail);
  }
  if (counts.warn > 0) {
    console.log(c("yellow", "\nWarnings — review when convenient."));
  } else {
    console.log(c("green", "\nAll checks passed."));
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(c("red", `\nFatal error: ${err.stack ?? err.message}`));
  process.exit(1);
});
