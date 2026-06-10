import helmet from 'helmet';
import xss from 'xss-clean';
import hpp from 'hpp';

/**
 * Applies security middlewares:
 * - helmet: sets various HTTP headers for security
 * - xss-clean: sanitizes user input (body, query, params)
 * - hpp: prevents HTTP parameter pollution
 */
export const securityMiddleware = [
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }),
  xss(),
  hpp(),
];

export default securityMiddleware;
