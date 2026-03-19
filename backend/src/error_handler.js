import { HttpError } from '../shared/http_errors.js';
import { ErrorCode } from '../shared/errors.js';

export function errorHandler(err, req, res, next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      meta: err.meta,
    });
  }
  if (err && typeof err.status === 'number') {
    return res.status(err.status).json({
      status: 'error',
      error: err.message || 'Error de solicitud',
    });
  }
  console.error("Unhandled error:", err);
  return res
    .status(500)
    .json({
      status: "error",
      code: ErrorCode.INTERNAL_ERROR,
      error: "Error interno del servidor",
    });
}