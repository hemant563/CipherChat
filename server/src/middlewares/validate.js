import ApiError from '../utils/ApiError.js';

/**
 * Middleware factory to validate request using Joi schema.
 * @param {Object} schema - Joi schema object containing params, query, or body validation
 */
const validate = (schema) => (req, res, next) => {
  const validSchema = ['params', 'query', 'body'].reduce((acc, key) => {
    if (schema[key]) acc[key] = schema[key];
    return acc;
  }, {});

  const validationResults = Object.keys(validSchema).map((key) => {
    const { error, value } = validSchema[key].validate(req[key], { abortEarly: false });
    if (!error) req[key] = value; // Replace req object with validated, typed values
    return error;
  });

  const errors = validationResults
    .filter((err) => err)
    .flatMap((err) => err.details.map((details) => details.message));

  if (errors.length > 0) {
    console.error('Validation failed details:', errors);
    return next(ApiError.badRequest('Validation failed', errors));
  }

  next();
};

export default validate;
