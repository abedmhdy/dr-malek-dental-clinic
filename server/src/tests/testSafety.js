// Hard safety guard, required at the top of every test file: these tests
// create, modify, and delete data, so they must be structurally incapable
// of ever running against the real clinic database, no matter what
// DATABASE_URL a shell happens to have set. Only a local Postgres instance
// (localhost/127.0.0.1) is accepted as a test target.
const url = process.env.DATABASE_URL || '';

let host = '';
try {
  host = new URL(url).hostname;
} catch {
  // fall through — empty host fails the check below too
}

const isLocal = host === 'localhost' || host === '127.0.0.1';

if (!isLocal) {
  throw new Error(
    'Refusing to run tests: DATABASE_URL does not point at localhost. ' +
      'Tests must run against a local, disposable Postgres database, never ' +
      'against the real Neon clinic database. Set DATABASE_URL to a local ' +
      'test database before running `npm test` — see server/src/tests/README.md.'
  );
}

if (process.env.NODE_ENV !== 'test') {
  throw new Error('Refusing to run tests: NODE_ENV must be "test".');
}

module.exports = {};
