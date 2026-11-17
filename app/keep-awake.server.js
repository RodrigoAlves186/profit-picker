// Render's free plan stops the server after 15 minutes without incoming requests, and the
// next visitor then waits about a minute on Render's loading screen. Requesting our own
// public address every 10 minutes counts as incoming traffic and keeps the server running.
const INTERVAL_MS = 10 * 60 * 1000;

const publicUrl = process.env.RENDER_EXTERNAL_URL;

if (publicUrl && !globalThis.__profitPickerKeepAwake) {
  globalThis.__profitPickerKeepAwake = setInterval(() => {
    fetch(`${publicUrl}/privacy`).catch(() => {});
  }, INTERVAL_MS);
  globalThis.__profitPickerKeepAwake.unref?.();
}
