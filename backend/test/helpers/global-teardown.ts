/**
 * Runs once after all e2e tests finish.
 * Can be used to clean up DB or temp files if needed.
 */
module.exports = async () => {
  // No-op — DB cleanup is done inside individual suites via afterAll.
};
