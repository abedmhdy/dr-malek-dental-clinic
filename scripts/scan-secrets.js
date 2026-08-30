#!/usr/bin/env node
// Pre-push secret scan. Run before every `git push`:
//   node scripts/scan-secrets.js
// Scans every file Git would actually track (respects .gitignore) for
// patterns that look like a real credential, not the placeholder examples
// used in documentation (e.g. "USER:PASSWORD@ep-xxxx" in CLOUD-DATABASE.md).
// Exits non-zero and prints matches if anything looks like a real secret.

const { execFileSync } = require('child_process');
const fs = require('fs');

const PLACEHOLDER_MARKERS = [
  'USER:PASSWORD',
  'user:password',
  'ep-xxxx',
  'ep-example',
  '[redacted]',
  '[REDACTED]',
  'replace_this',
  'your_',
  'YOUR_',
];

const PATTERNS = [
  { name: 'Postgres/Neon connection string with credentials', re: /postgres(?:ql)?:\/\/[^\s"'/]+:[^\s"'/@]+@/gi },
  { name: 'Private key block', re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'AWS access key ID', re: /AKIA[0-9A-Z]{16}/g },
  { name: 'Generic long hex/base64 secret assigned to SESSION_SECRET', re: /SESSION_SECRET\s*=\s*['"]?[A-Za-z0-9+/_-]{20,}/g },
];

function trackedFiles() {
  // Everything Git would include in a commit right now: tracked files plus
  // untracked-but-not-ignored files (exactly what `git add -A` would stage).
  const out = execFileSync('git', ['status', '--porcelain', '-uall'], { cwd: __dirname + '/..' }).toString();
  const files = [];
  for (const line of out.split('\n')) {
    if (!line.trim()) continue;
    const path = line.slice(3).trim();
    if (path) files.push(path);
  }
  // Also include already-committed files, in case a secret was committed in
  // the past and nothing about it changed in the working tree right now.
  const committed = execFileSync('git', ['ls-files'], { cwd: __dirname + '/..' }).toString().split('\n').filter(Boolean);
  return Array.from(new Set([...files, ...committed]));
}

function isPlaceholder(line) {
  return PLACEHOLDER_MARKERS.some((marker) => line.includes(marker));
}

function main() {
  const root = __dirname + '/..';
  const files = trackedFiles();
  let findings = 0;

  for (const relPath of files) {
    const fullPath = `${root}/${relPath}`;
    let content;
    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile() || stat.size > 5 * 1024 * 1024) continue;
      content = fs.readFileSync(fullPath, 'utf8');
    } catch {
      continue; // deleted/binary/unreadable — skip
    }

    for (const { name, re } of PATTERNS) {
      const lines = content.split('\n');
      lines.forEach((line, i) => {
        re.lastIndex = 0;
        if (re.test(line) && !isPlaceholder(line)) {
          findings += 1;
          console.error(`[POSSIBLE SECRET] ${relPath}:${i + 1} — ${name}`);
        }
      });
    }
  }

  if (findings > 0) {
    console.error(`\n${findings} possible secret(s) found. Do NOT push until resolved.`);
    process.exit(1);
  }
  console.log('No secrets found in tracked/stageable files. Safe to push.');
}

main();
