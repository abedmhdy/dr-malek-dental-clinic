// Intentionally empty. The renderer (the same React app used in the browser)
// only ever talks to the local backend over plain HTTP/fetch, exactly as it
// does when run in a normal browser — it needs no Node or Electron APIs, so
// nothing is exposed here. contextIsolation stays on and nodeIntegration
// stays off in main.js for defense in depth regardless.
