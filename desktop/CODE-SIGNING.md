# Windows code signing — status and setup

**Installer is still unsigned.** This is a deliberate, current-state fact,
not an oversight — no certificate has been purchased or faked. Windows will
show a SmartScreen "unknown publisher" warning on install, exactly as it
does today.

## What certificate is required

A **code-signing certificate** for Windows executables (`.exe`), issued by
a Certificate Authority (CA) trusted by Microsoft. Two kinds exist:

- **OV (Organization Validation)** — cheaper, but new/low-reputation
  publishers still get some SmartScreen friction until enough machines have
  seen the certificate ("reputation" builds up over time/downloads).
- **EV (Extended Validation)** — more expensive and requires stricter
  identity verification (often a hardware token or cloud HSM), but gets
  **immediate** SmartScreen trust with no reputation-building period.

For a small clinic app installed on a handful of machines, EV is usually
worth the extra cost specifically because it skips the reputation delay —
OV can mean the warning persists for a while even after signing.

## Where to obtain one

Any CA on Microsoft's trusted list — common options: DigiCert, SSL.com,
Sectigo, GlobalSign. Approximate cost: **OV ≈ $100–250/year** (often
cheaper through a reseller like SSL.com than buying direct), **EV ≈
$300–500/year**, sometimes bundled with a required hardware token or a
cloud-based option like **Azure Trusted Signing** (Microsoft's own
pay-as-you-go signing service — no physical token, integrates with
electron-builder, worth comparing directly against a traditional cert
if the yearly cost of a rarely-updated internal app matters more than
owning the certificate outright).

## Approximate process

1. Purchase from the CA, choose OV or EV.
2. Complete identity verification (business documents, a phone call for
   EV, etc. — this is the part that actually takes time, often 1–5
   business days).
3. Receive either a downloadable `.pfx`/`.p12` file (OV, password-protected)
   or a hardware token / cloud HSM credential (EV, or Azure Trusted
   Signing).
4. Wire it into the build (below) and rebuild — signing itself is instant.

## What's already prepared in this project

Nothing needs to change in `desktop/package.json`'s `build` config —
electron-builder auto-detects signing from environment variables alone, so
today's unsigned build and a future signed build use the **exact same
build command** (`npm run dist`), just with different environment
variables present.

### For a traditional `.pfx` certificate

Set these environment variables before running `npm run dist`:

| Variable | Value |
|---|---|
| `CSC_LINK` | Path to the `.pfx` file (or a `file://` / `https://` URL to it) |
| `CSC_KEY_PASSWORD` | The certificate's password |

And **remove** `CSC_IDENTITY_AUTO_DISCOVERY=false` from the build command
in `desktop/package.json`'s `"dist"` script — that flag is what currently
forces signing off; it's the only line that needs to change.

### For Azure Trusted Signing / a cloud HSM

electron-builder supports this via its `azureSignOptions` config block
(different from `CSC_LINK`) — see
https://www.electron.build/configuration/win#azuresignoptions when that
path is chosen; the specifics depend on which Azure signing tier is
purchased.

## Never do this

- Never commit a `.pfx`/`.p12` file or its password to Git, even a "test"
  one — `desktop/.gitignore` and the project's `.gitignore` do not
  currently exclude `*.pfx`/`*.p12` by name (only `resources/`/`release/`
  are excluded), so if a certificate file is ever placed in this repo,
  **add an explicit gitignore entry for it first**, before it's ever
  staged.
- Never use a self-signed certificate and present it as equivalent to a
  CA-issued one — a self-signed cert doesn't remove the SmartScreen
  warning at all; it only changes what the warning says, which is worse
  than being honest that the app is unsigned.
