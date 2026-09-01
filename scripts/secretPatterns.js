// Shared secret-detection patterns used by both scan-secrets.js (git/source
// tree) and scan-release-artifacts.js (build outputs — client/dist,
// desktop/resources, packaged .exe/.asar). Keeping one definition means the
// two scanners can never quietly drift apart on what counts as a finding.

const PLACEHOLDER_MARKERS = [
  'USER:PASSWORD',
  'user:password',
  'ep-xxxx',
  'ep-example',
  'your-backend.example.com',
  '[redacted]',
  '[REDACTED]',
  'replace_this',
  'your_',
  'YOUR_',
  // Test fixtures: deliberately fake/unreachable credentials used to test
  // failure paths, never real ones — see server/src/tests/.
  'baduser:badpass',
  'nonexistent-host-for-testing',
  'test_secret_not_used_in_production',
  // Prisma's own CLI ships these example connection strings in its help
  // text (node_modules/prisma/build/index.js) — not a credential of ours.
  'johndoe:randompassword',
  'login:password@localhost',
];

const PATTERNS = [
  { name: 'Postgres/Neon connection string with credentials', re: /postgres(?:ql)?:\/\/[^\s"'/]+:[^\s"'/@]+@/gi },
  { name: 'Neon hostname', re: /[a-z0-9-]+\.(?:[a-z0-9-]+\.)?aws\.neon\.tech/gi },
  { name: 'Private key block', re: /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/g },
  { name: 'AWS access key ID', re: /AKIA[0-9A-Z]{16}/g },
  { name: 'Generic long hex/base64 secret assigned to SESSION_SECRET', re: /SESSION_SECRET\s*[=:]\s*['"]?[A-Za-z0-9+/_-]{20,}/g },
  { name: 'DATABASE_URL/DIRECT_URL assigned a real value', re: /(?:DATABASE|DIRECT)_URL\s*[=:]\s*['"]?postgres/gi },
];

function isPlaceholder(text) {
  return PLACEHOLDER_MARKERS.some((marker) => text.includes(marker));
}

module.exports = { PLACEHOLDER_MARKERS, PATTERNS, isPlaceholder };
