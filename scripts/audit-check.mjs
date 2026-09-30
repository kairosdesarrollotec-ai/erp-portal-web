#!/usr/bin/env node
/**
 * SCA audit check with allowlist for known, tracked HIGH/CRITICAL vulnerabilities.
 *
 * Behavior:
 *   - FAIL on any HIGH or CRITICAL not listed in audit-allowlist.json
 *   - WARN (no fail) on allowlisted entries, printing their remediation info
 *   - WARN on entries whose target_date has passed (SLA breach)
 *   - EXIT 0 only when all HIGH/CRITICAL are either absent or in the allowlist
 *
 * Usage:
 *   node scripts/audit-check.mjs [--include-dev]
 *   --include-dev: also check devDependencies (default: production only, --omit=dev)
 */

import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const includeDev = process.argv.includes('--include-dev');
const auditFlags = includeDev ? '' : '--omit=dev';

const allowlistPath = join(__dirname, '..', 'audit-allowlist.json');
let allowlist;
try {
  allowlist = JSON.parse(readFileSync(allowlistPath, 'utf8'));
} catch {
  console.error('❌ Cannot read audit-allowlist.json');
  process.exit(1);
}

const allowedSources = new Map(
  allowlist.entries.map((e) => [String(e.source), e]),
);

const today = new Date().toISOString().slice(0, 10);

let auditOutput;
try {
  auditOutput = execSync(`npm audit ${auditFlags} --json`, {
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
} catch (err) {
  // npm audit exits non-zero when vulnerabilities are found; stdout still has JSON
  auditOutput = err.stdout ?? '';
}

let auditResult;
try {
  auditResult = JSON.parse(auditOutput);
} catch {
  console.error('❌ Failed to parse npm audit output');
  process.exit(1);
}

const vulns = auditResult.vulnerabilities ?? {};
const blockSeverities = new Set(['critical', 'high']);

let unallowedCount = 0;
let slaBreachCount = 0;
let allowedCount = 0;

for (const [, vuln] of Object.entries(vulns)) {
  if (!blockSeverities.has(vuln.severity)) continue;

  const advisories = Array.isArray(vuln.via)
    ? vuln.via.filter((v) => typeof v === 'object' && v.source)
    : [];

  if (advisories.length === 0) continue;

  for (const advisory of advisories) {
    const src = String(advisory.source);
    const entry = allowedSources.get(src);

    if (!entry) {
      console.error(
        `\n❌ UNALLOWED ${vuln.severity.toUpperCase()}: ${vuln.name} (advisory ${src})`,
      );
      console.error(`   Title: ${advisory.title ?? 'unknown'}`);
      console.error(`   URL:   ${advisory.url ?? 'unknown'}`);
      console.error(
        `   Fix:   ${JSON.stringify(vuln.fixAvailable ?? 'manual')}`,
      );
      unallowedCount++;
    } else {
      const slaBreached = entry.target_date < today;
      const prefix = slaBreached ? '🔴 SLA BREACH' : '⚠️  ALLOWED';
      console.warn(
        `\n${prefix} ${vuln.severity.toUpperCase()}: ${vuln.name} (${entry.ghsa})`,
      );
      console.warn(`   Reason:      ${entry.reason}`);
      console.warn(`   Remediation: ${entry.remediation}`);
      console.warn(`   Target date: ${entry.target_date} | Owner: ${entry.owner}`);
      if (slaBreached) {
        console.warn(`   ⚠️  SLA passed ${today} — escalate or update target_date`);
        slaBreachCount++;
      }
      allowedCount++;
    }
  }
}

console.log('\n─────────────────────────────────────────────────');
if (unallowedCount > 0) {
  console.error(
    `❌ ${unallowedCount} new HIGH/CRITICAL finding(s) not in allowlist.`,
  );
  console.error(
    '   Fix them or add to audit-allowlist.json with a remediation plan and target_date.',
  );
  process.exit(1);
}

if (slaBreachCount > 0) {
  console.warn(`⚠️  ${slaBreachCount} allowlisted finding(s) past their SLA target_date.`);
  console.warn('   Update target_date in audit-allowlist.json or escalate remediation.');
}

const noHighCrit =
  Object.values(vulns).filter((v) => blockSeverities.has(v.severity)).length === 0;

if (noHighCrit) {
  console.log('✅ No HIGH or CRITICAL vulnerabilities found.');
} else {
  console.log(
    `✅ All ${allowedCount} HIGH/CRITICAL advisory(ies) are in the allowlist with tracked remediation.`,
  );
}
