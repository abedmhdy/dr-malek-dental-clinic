#!/usr/bin/env node
// Scans actual BUILD OUTPUT for leaked credentials — the complement to
// scan-secrets.js (which scans git-tracked source). Run after any build,
// before handing an installer to anyone:
//   node scripts/scan-release-artifacts.js
//
// Covers, if present: client/dist, desktop/resources, desktop/release
// (win-unpacked/app.asar and the .exe installers themselves — binary-safe,
// so this also catches a credential embedded raw in the packaged
// executable, not just in text files).

const fs = require('fs');
const path = require('path');
const { PATTERNS, isPlaceholder: isPlaceholderText } = require('./secretPatterns');

const ROOT = path.join(__dirname, '..');
const TARGETS = [
  path.join(ROOT, 'client', 'dist'),
  path.join(ROOT, 'desktop', 'resources'),
  path.join(ROOT, 'desktop', 'release'),
];

const MAX_FILE_SIZE = 250 * 1024 * 1024; // skip absurdly large files (none expected here)

// Third-party package documentation (READMEs full of example connection
// strings that aren't ours) and pre-built third-party binaries are pure
// noise for "did OUR build leak OUR credential" — skip them inside
// node_modules specifically. Our own source, our own config.seed.env, and
// our own built client bundle are never excluded.
const SKIP_WITHIN_NODE_MODULES = /\.(md|txt|exe|dll|node)$/i;

function shouldSkip(fullPath) {
  return fullPath.includes(`${path.sep}node_modules${path.sep}`) && SKIP_WITHIN_NODE_MODULES.test(fullPath);
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.isFile() && !shouldSkip(full)) {
      out.push(full);
    }
  }
  return out;
}

// Binary-safe: scans the raw byte buffer as latin1 text (1 byte = 1 char,
// so no multi-byte decoding surprises) rather than assuming UTF-8 — a
// credential embedded in a compiled .exe/.asar is still findable this way.
function scanFile(fullPath) {
  const stat = fs.statSync(fullPath);
  if (stat.size > MAX_FILE_SIZE) return [];
  const buffer = fs.readFileSync(fullPath);
  const text = buffer.toString('latin1');
  const findings = [];
  for (const { name, re } of PATTERNS) {
    re.lastIndex = 0;
    let match;
    while ((match = re.exec(text))) {
      const context = text.slice(Math.max(0, match.index - 20), match.index + 20);
      if (!isPlaceholderText(context)) {
        findings.push(name);
      }
      if (!re.global) break;
    }
  }
  return findings;
}

function main() {
  let totalFindings = 0;
  let filesScanned = 0;
  let anyTargetExisted = false;

  for (const target of TARGETS) {
    if (!fs.existsSync(target)) {
      console.log(`(skipped — does not exist right now: ${path.relative(ROOT, target)})`);
      continue;
    }
    anyTargetExisted = true;
    const files = walk(target);
    for (const file of files) {
      filesScanned += 1;
      const findings = scanFile(file);
      for (const name of findings) {
        totalFindings += 1;
        console.error(`[POSSIBLE SECRET] ${path.relative(ROOT, file)} — ${name}`);
      }
    }
  }

  console.log(`\nScanned ${filesScanned} file(s) across build artifacts.`);
  if (!anyTargetExisted) {
    console.log('No build artifacts currently exist to scan — run a build first, then re-run this.');
  }

  if (totalFindings > 0) {
    console.error(`${totalFindings} possible secret(s) found in build output. Do NOT ship this build.`);
    process.exit(1);
  }
  console.log('Clean — no secrets found in any scanned build artifact.');
}

main();
