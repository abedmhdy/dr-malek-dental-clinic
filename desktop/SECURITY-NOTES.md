# Security notes — packaged desktop app

## Where the Neon credentials live

The app needs `DATABASE_URL`, `DIRECT_URL`, and `SESSION_SECRET` to connect
to the cloud database. In this packaged build:

1. A **seed copy** of these values (taken from `server/.env` at the moment
   the app was built) is bundled inside the installed app's resources
   folder, in a plain text file (`config.seed.env`).
2. On the **first launch only**, that seed is copied into:
   `%AppData%\Dr. Malek Dental Clinic\config.env`
   (a per-Windows-user folder, e.g.
   `C:\Users\<name>\AppData\Roaming\Dr. Malek Dental Clinic\config.env`).
3. **Every launch after that** reads from the `%AppData%` copy, not the
   bundled seed — so editing the bundled file after install does nothing;
   edit the `%AppData%` copy instead if the connection details ever change.

## Is this safe enough?

**Same risk level as the existing setup, not worse, not meaningfully
better.** Today, `server/.env` on a development machine holds these same
values in plain text; the packaged app holds them in plain text too, just
in a different (Windows-standard, per-user) folder. In both cases:

- **Protected by:** the connection is always TLS-encrypted in transit
  (`sslmode=require`) — nothing is exposed on the network. Windows' normal
  per-user file permissions mean another Windows account on the same
  computer can't read it (assuming they don't have admin rights).
- **Not protected against:** anyone with physical/admin access to that
  specific Windows user account and machine *can* open the config file in
  Notepad and read the database password in plain text. This is inherent to
  storing a plaintext secret anywhere on a general-purpose computer, not
  something this packaging step introduced.

## A better way exists — not implemented here

The properly hardened version of this would use **Windows Credential
Manager** (via an Electron package like `keytar`) to store the connection
string in Windows' encrypted credential vault instead of a plain file, so
even another admin account (or a stolen laptop with the disk removed and
read elsewhere) couldn't trivially read it. This was **intentionally not
implemented now** — you asked for a working local version first, and this
is a real architectural change (a first-run "enter your database connection"
flow instead of a bundled seed) worth doing deliberately, not folded into
this packaging pass. It's listed as a follow-up in the main project's
CLOUD-DATABASE.md.

## What IS already solid, unchanged by packaging

- Passwords are still bcrypt-hashed; nothing about authentication changed.
- Session cookies are still `httpOnly`; the desktop window loads the app
  over plain `http://localhost:4000` (loopback-only, never reachable from
  outside this computer) rather than a real network, which is why the
  cookie isn't marked `Secure` here specifically (see the comment in
  `server/src/config/session.js`).
- CSRF protection, rate limiting, and the audit log are all unchanged.
- The frontend still never holds a database credential of any kind — only
  the backend process (spawned locally, not reachable from outside this
  machine) ever reads `config.env`.
