/**
 * Wraps async Express route handlers to automatically catch errors
 * and forward them to the global error handler.
 *
 * @param {Function} fn - Async request handler (req, res, next) => Promise
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

export default asyncHandler;
