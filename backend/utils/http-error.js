export class HttpError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const getErrorStatus = (error) => {
  if (error?.statusCode) {
    return error.statusCode;
  }

  if (error?.name === 'ValidationError') {
    return 400;
  }

  if (error?.code === 11000) {
    return 409;
  }

  return 500;
};

export const sendError = (res, error) => {
  const statusCode = getErrorStatus(error);
  const payload = {
    error:
      statusCode >= 500
        ? 'Something went wrong while processing the request'
        : error.message,
  };

  if (error?.details) {
    payload.details = error.details;
  }

  if (process.env.NODE_ENV !== 'production' && statusCode >= 500) {
    payload.debug = error?.message;
  }

  return res.status(statusCode).json(payload);
};
