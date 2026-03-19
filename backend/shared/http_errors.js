import { ErrorMessages, ErrorCode } from './errors.js';

export class HttpError extends Error {
  constructor(status, code, message, meta) {
    super(message || ErrorMessages[code] || "Error");
    this.status = status || 500;
    this.code = code || ErrorCode.INTERNAL_ERROR;
    this.meta = meta;
  }
}
