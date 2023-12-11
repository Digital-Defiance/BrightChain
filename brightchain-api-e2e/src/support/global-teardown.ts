module.exports = async function () {
  console.log(globalThis.__TEARDOWN_MESSAGE__);

  const app = globalThis.__BRIGHTCHAIN_APP__;
  if (app) {
    try {
      await app.stop();
      console.log('[e2e] Server stopped successfully');
    } catch (err) {
      console.error('[e2e] Error stopping server:', err);
    }
    globalThis.__BRIGHTCHAIN_APP__ = undefined;
  }
};
