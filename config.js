module.exports = {

  // Server-wide passcode — every REST request and WS connection must know this.
  // Set via env var (API_PASSCODE=...) or change the fallback below.
  // On first boot the server hashes it with bcrypt; the plaintext is never stored.
  API_PASSCODE: process.env.API_PASSCODE || 'change-this-before-hosting',

  // Port to listen on. Hosting platforms override this via process.env.PORT.
  PORT: 3000,

  // Max file size that can be saved to the server via "Save in Chat" (bytes).
  SAVE_SIZE_LIMIT_BYTES: 128 * 1024 * 1024, // 128 MB

  // Directory where saved files are written. Created automatically if missing.
  SAVED_FILES_DIR: 'saved_files',

};
