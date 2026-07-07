/* ── köfi server configuration ────────────────────────────────────────────
   Edit these values before starting the server.
──────────────────────────────────────────────────────────────────────────── */

module.exports = {

  // Maximum file size that can be saved to the server (Save in Chat feature).
  // Files larger than this cannot be saved — users will see an error.
  // Default: 128 MB
  SAVE_SIZE_LIMIT_BYTES: 128 * 1024 * 1024,

  // Directory where saved files are stored on disk.
  // Relative to the project root. Created automatically if it doesn't exist.
  SAVED_FILES_DIR: 'saved_files',

};
