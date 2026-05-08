#!/usr/bin/env node
// Monthly subdomain takeover audit.
//
//   node scripts/audit-subdomains.mjs
//   CLOUDFLARE_API_TOKEN=… CLOUDFLARE_ZONE_ID=… node scripts/audit-subdomains.mjs --json
//
// Lists every DNS record in the Cloudflare zone, follows each CNAME target, and
// flags records that look like classic subdomain-takeover bait (Heroku, GitHub
// Pages, Netlify, Vercel, S3, etc) where the target no longer resolves or the
// vendor's "this app does not exist" fingerprint shows up.
//
// Output verdicts:
//   SAFE             — record resolves, no known vendor fingerprint
//   VULNERABLE       — vendor fingerprint matches a known takeover signature
//   CHECK MANUALLY   — heuristic concern (NXDOMAIN on a vendor target, etc)

import dns from "node:dns/promises";
import { setTimeout as sleep } from "node:timers/promises";
import fs from "node:fs/promises";
import path from "node:path";

const args = process.argv.slice(2);
function flag(name) {
  return args.includes(`--${name}`);
}
function arg(name, fallback) {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
}

await loadDotEnv();

const TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const ZONE = arg("zone", process.env.CLOUDFLARE_ZONE_ID);
const JSON_OUT = flag("json");
const TIMEOUT_MS = 8_000;

if (!TOKEN || !ZONE || TOKEN.startsWith("get_from_") || ZONE.startsWith("get_from_")) {
  console.error(
    "Missing CLOUDFLARE_API_TOKEN or CLOUDFLARE_ZONE_ID. Set them in .env.local or pass --zone.",
  );
  process.exit(2);
}

const fmt = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
};
const tty = process.stdout.isTTY && !JSON_OUT;
const c = (color, s) => (tty ? `${fmt[color]}${s}${fmt.reset}` : s);

// Vendor fingerprints — { hostSuffix: { name, body: regex|string|null, status?: number } }
// `body` matches the response from probing https://<host> — a hit means the
// vendor explicitly said "no app here", which is the takeover signal.
const VENDORS = [
  { match: /\.herokuapp\.com$/i, name: "Heroku", body: /No such app/i },
  { match: /\.github\.io$/i, name: "GitHub Pages", body: /There isn't a GitHub Pages site here/i },
  { match: /\.netlify\.app$/i, name: "Netlify", body: /Not Found - Request ID/i },
  { match: /\.vercel\.app$/i, name: "Vercel", body: /DEPLOYMENT_NOT_FOUND/i },
  { match: /\.cloudfront\.net$/i, name: "AWS CloudFront", body: /Bad request|ERROR: The request could not be satisfied/i },
  { match: /\.s3[.-].*\.amazonaws\.com$/i, name: "AWS S3", body: /NoSuchBucket/i },
  { match: /\.s3\.amazonaws\.com$/i, name: "AWS S3", body: /NoSuchBucket/i },
  { match: /\.azurewebsites\.net$/i, name: "Azure App Service", body: /404 Web Site not found/i },
  { match: /\.cloudapp\.net$/i, name: "Azure", body: null },
  { match: /\.fastly\.net$/i, name: "Fastly", body: /Fastly error: unknown domain/i },
  { match: /\.surge\.sh$/i, name: "Surge", body: /project not found/i },
  { match: /\.tumblr\.com$/i, name: "Tumblr", body: /There's nothing here/i },
  { match: /\.shopify\.com$/i, name: "Shopify", body: /Sorry, this shop is currently unavailable/i },
  { match: /\.zendesk\.com$/i, name: "Zendesk", body: /Help Center Closed/i },
  { match: /\.statuspage\.io$/i, name: "Statuspage", body: /You are being redirected/i },
];

function vendorFor(target) {
  return VENDORS.find((v) => v.match.test(target));
}

function withTimeout(p, ms = TIMEOUT_MS, label = "operation") {
  return Promise.race([
    p,
    sleep(ms).then(() => {
      throw new Error(`${label} timed out`);
    }),
  ]);
}

async function fetchAllRecords() {
  const out = [];
  let page = 1;
  // Cloudflare paginates DNS records at 100/page.
  while (true) {
    const url = `https://api.cloudflare.com/client/v4/zones/${ZONE}/dns_records?per_page=100&page=${page}`;
    const res = await withTimeout(
      fetch(url, {
        headers: {
          Authorization: `Bearer ${TOKEN}`,
          "Content-Type": "application/json",
        },
      }),
      TIMEOUT_MS,
      "Cloudflare API",
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Cloudflare API ${res.status}: ${body.slice(0, 200)}`);
    }
    const json = await res.json();
    if (!json.success) {
      throw new Error(`Cloudflare API error: ${JSON.stringify(json.errors)}`);
    }
    out.push(...json.result);
    const totalPages = json.result_info?.total_pages ?? 1;
    if (page >= totalPages) break;
    page += 1;
  }
  return out;
}

async function probeBody(host) {
  try {
    const res = await withTimeout(
      fetch(`https://${host}/`, {
        method: "GET",
        redirect: "manual",
        // a few KB is plenty to fingerprint vendor 404 pages
        headers: { "user-agent": "ntv-subdomain-audit/1.0" },
      }),
      TIMEOUT_MS,
      `probe ${host}`,
    );
    const text = await res.text();
    return { status: res.status, body: text.slice(0, 4096) };
  } catch (err) {
    return { status: 0, body: "", error: err.message };
  }
}

async function classifyCname(record) {
  const target = record.content;
  const vendor = vendorFor(target);
  let resolves = true;
  try {
    await withTimeout(dns.resolve(target), TIMEOUT_MS, `resolve ${target}`);
  } catch {
    resolves = false;
  }

  if (!vendor) {
    if (!resolves) {
      return {
        verdict: "CHECK MANUALLY",
        reason: `CNAME target ${target} does not resolve.`,
      };
    }
    return { verdict: "SAFE", reason: `Resolves to ${target}.` };
  }

  // Known vendor — probe to confirm.
  if (!resolves) {
    return {
      verdict: "VULNERABLE",
      reason: `${vendor.name} target ${target} does not resolve. Likely takeover bait.`,
    };
  }
  if (!vendor.body) {
    return {
      verdict: "CHECK MANUALLY",
      reason: `${vendor.name} target — no automatic fingerprint, verify manually.`,
    };
  }
  const probe = await probeBody(record.name);
  if (probe.error) {
    return {
      verdict: "CHECK MANUALLY",
      reason: `${vendor.name} probe failed: ${probe.error}`,
    };
  }
  const matched =
    typeof vendor.body === "string"
      ? probe.body.includes(vendor.body)
      : vendor.body.test(probe.body);
  if (matched) {
    return {
      verdict: "VULNERABLE",
      reason: `${vendor.name} returned its "no app here" fingerprint at ${record.name}.`,
    };
  }
  return {
    verdict: "SAFE",
    reason: `${vendor.name} responded ${probe.status} without takeover fingerprint.`,
  };
}

async function classifyA(record) {
  const target = record.content;
  try {
    await withTimeout(
      fetch(`https://${record.name}/`, {
        method: "HEAD",
        redirect: "manual",
      }),
      TIMEOUT_MS,
      `A probe ${record.name}`,
    );
    return { verdict: "SAFE", reason: `A → ${target}, host responds.` };
  } catch {
    return {
      verdict: "CHECK MANUALLY",
      reason: `A → ${target} did not respond on https. Could be intentional (mail, internal) or stale.`,
    };
  }
}

async function classify(record) {
  switch (record.type) {
    case "CNAME":
      return classifyCname(record);
    case "A":
    case "AAAA":
      return classifyA(record);
    default:
      return { verdict: "SAFE", reason: `${record.type} record — not in scope for takeover audit.` };
  }
}

function verdictColor(v) {
  return v === "SAFE" ? "green" : v === "VULNERABLE" ? "red" : "yellow";
}

async function main() {
  if (!JSON_OUT) {
    console.log(c("bold", `\nSubdomain audit — zone ${ZONE}\n`));
  }

  const records = await fetchAllRecords();
  const inScope = records.filter((r) => ["CNAME", "A", "AAAA"].includes(r.type));

  // Run with a small concurrency cap so we don't hammer DNS.
  const out = [];
  const CONC = 5;
  for (let i = 0; i < inScope.length; i += CONC) {
    const batch = inScope.slice(i, i + CONC);
    const part = await Promise.all(
      batch.map(async (r) => ({
        name: r.name,
        type: r.type,
        target: r.content,
        proxied: r.proxied ?? false,
        ...(await classify(r)),
      })),
    );
    out.push(...part);
  }

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify(out, null, 2));
    return;
  }

  for (const row of out) {
    const tag = `[${row.verdict}]`.padEnd(18);
    console.log(
      `${c(verdictColor(row.verdict), tag)} ${c("bold", row.name)} ${c("dim", `${row.type} → ${row.target}`)}`,
    );
    console.log(`  ${c("dim", row.reason)}`);
  }

  const counts = out.reduce(
    (acc, r) => ((acc[r.verdict] = (acc[r.verdict] ?? 0) + 1), acc),
    {},
  );
  console.log("");
  console.log(
    c("bold", `Total: ${out.length}`) +
      c("green", `  safe=${counts.SAFE ?? 0}`) +
      c("yellow", `  manual=${counts["CHECK MANUALLY"] ?? 0}`) +
      c("red", `  vulnerable=${counts.VULNERABLE ?? 0}`),
  );

  if ((counts.VULNERABLE ?? 0) > 0) {
    console.log(c("red", "\nVulnerable records detected — investigate before next deploy."));
    process.exit(1);
  }
  if ((counts["CHECK MANUALLY"] ?? 0) > 0) {
    console.log(c("yellow", "\nSome records need a manual sanity check."));
  } else {
    console.log(c("green", "\nAll records look safe."));
  }
}

main().catch((err) => {
  console.error(`Fatal: ${err.stack ?? err.message}`);
  process.exit(1);
});

// Tiny .env.local loader so cron can run this without `dotenv` installed.
async function loadDotEnv() {
  const p = path.resolve(process.cwd(), ".env.local");
  try {
    const raw = await fs.readFile(p, "utf8");
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq < 0) continue;
      const k = trimmed.slice(0, eq).trim();
      const v = trimmed.slice(eq + 1).trim();
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    // .env.local not present — fine in CI / cron environments.
  }
}
