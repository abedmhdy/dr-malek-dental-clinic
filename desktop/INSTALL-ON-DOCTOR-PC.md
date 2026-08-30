# Installing Dr. Malek Dental Clinic — on the clinic computer

_This guide assumes no programming experience. Follow it top to bottom._

## What this is

A Windows program for Dr. Malek Abu Sholdom's clinic management system. It
looks and works like any other desktop app — double-click an icon, log in,
use it. The patient data lives securely in the cloud (the same database
already in use), so nothing needs to be copied or synced between computers.

## Before you start

- The computer needs an **internet connection** the whole time the app is
  open (patient data is fetched live from the cloud, not stored on this
  computer).
- You do **not** need to install Node.js, PostgreSQL, VS Code, or anything
  else first. This installer contains everything required.

## Installation steps

This folder contains two ways to run the app — use the **installer**
(recommended: adds a proper Desktop shortcut and Start Menu entry, and
supports clean uninstall/updates). The **portable** version is a fallback
for a computer where installing software isn't allowed — it needs no
installation, just double-click it directly from the USB drive or a copied
folder, but you'd have to create your own Desktop shortcut for it manually.

1. Insert the USB drive into the clinic computer.
2. Open the USB drive in File Explorer (**This PC → USB drive**).
3. Double-click **`DrMalekDentalClinic-Setup-1.0.0.exe`**.
4. If Windows shows a blue "Windows protected your PC" screen, click
   **More info**, then **Run anyway**. (This appears because the installer
   isn't yet registered with Microsoft's certification service — it is safe;
   you built and verified it yourself.)
5. In the setup wizard:
   - Click **Next**.
   - Choose an installation location, or leave the default, then **Next**.
   - Click **Install**.
   - When it finishes, leave **"Run Dr. Malek Dental Clinic"** checked and
     click **Finish**.
6. Confirm a shortcut named **"Dr. Malek Dental Clinic"** now appears on the
   Desktop.
7. Double-click it. The app opens directly to the **login page**.
8. Log in with the doctor's existing username and password (the same ones
   already used).
9. Confirm the same patients, appointments, visit history, treatment plans,
   and payments appear as on any other computer — this confirms it's
   correctly connected to the same cloud database.
10. To close the app, just close its window like any other program — the
    background process it uses shuts down automatically with it.
11. To use it again later, double-click the Desktop icon any time.

## If something goes wrong

- **"The local server could not start" on launch** — almost always means no
  internet connection. Check the network and try again.
- **Blank or stuck screen** — close the app fully (check it isn't still
  running in the background via Task Manager → search "Dr. Malek" or
  "electron") and reopen it.
- **Forgotten password** — this cannot be reset from the doctor's computer
  alone; it needs to be reset from a computer where `npm run create-admin`
  can be run against the same database (see the main project's README.md),
  or contact whoever set up the system originally.

## Updating later

Because all patient data lives in the cloud database, not inside the app
itself, installing a newer version is always safe and never touches any
patient data:

1. Get the new `DrMalekDentalClinic-Setup-<version>.exe` onto the computer
   (USB, same as this one).
2. Just run it, the same way you did the first time — click through the
   wizard again. It installs over the existing version (the installer
   handles this; no need to uninstall first).
3. The Desktop shortcut, all settings, and — most importantly — every
   patient, appointment, and payment remain exactly as they were, because
   none of that is stored by the app itself.

## A note on this being a first version

This app was prepared and tested once, on one computer, for this specific
clinic. It has not gone through the kind of extended real-world testing a
commercial product would — keep an eye out for anything that looks wrong
after the first few real days of use, and keep using the regular cloud
backup habits already in place for the underlying database.
