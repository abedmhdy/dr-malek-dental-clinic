#!/usr/bin/env node
// Pre-push secret scan. Run before every `git push`:
//   node scripts/scan-secrets.js
// Scans every file Git would actually track (respects .gitignore) for
// patterns that look like a real credential, not the placeholder examples
// used in documentation (e.g. "USER:PASSWORD@ep-xxxx" in CLOUD-DATABASE.md).
// Exits non-zero and prints matches if anything looks like a real secret.
//
// Add --history for a slower, thorough one-time audit that also scans every
// line ever added across the FULL git history (git log -p), not just the
// current tree — use this after cloning a repo of unknown provenance, or
// periodically, rather than on every push.

const { execFileSync } = require('child_process');
const fs = require('fs');
const { PATTERNS, isPlaceholder: isPlaceholderText } = require('./secretPatterns');

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

function scanHistory(root) {
  // git log -p prints every added/removed line across every commit —
  // slow on a large repo, fine for this one. Scanning the diff output
  // directly (rather than checking out each past commit) catches a secret
  // even if it was later removed in a subsequent commit, since it still
  // exists in history until the commit itself is rewritten.
  const log = execFileSync('git', ['log', '-p', '--all'], { cwd: root, maxBuffer: 1024 * 1024 * 200 }).toString();
  let findings = 0;
  const lines = log.split('\n');
  lines.forEach((line, i) => {
    if (!line.startsWith('+')) return; // only lines a commit actually introduced
    for (const { name, re } of PATTERNS) {
      re.lastIndex = 0;
      if (re.test(line) && !isPlaceholderText(line)) {
        findings += 1;
        console.error(`[POSSIBLE SECRET IN HISTORY] log line ${i + 1} — ${name}`);
      }
    }
  });
  return findings;
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
        if (re.test(line) && !isPlaceholderText(line)) {
          findings += 1;
          console.error(`[POSSIBLE SECRET] ${relPath}:${i + 1} — ${name}`);
        }
      });
    }
  }

  if (process.argv.includes('--history')) {
    findings += scanHistory(root);
  }

  if (findings > 0) {
    console.error(`\n${findings} possible secret(s) found. Do NOT push until resolved.`);
    process.exit(1);
  }
  console.log(
    process.argv.includes('--history')
      ? 'No secrets found in tracked files or full git history. Safe to push.'
      : 'No secrets found in tracked/stageable files. Safe to push.'
  );
}

main();
