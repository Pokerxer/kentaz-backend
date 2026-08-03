// Typed application errors used by the service layer. `status` is read by the
// centralized error handler in index.js (`res.status(err.status || 500)`), so
// throwing these yields the right HTTP code without extra mapping.

class AppError extends Error {
  constructor(message, status) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    Error.captureStackTrace?.(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = 'Validation failed') {
    super(message, 400);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404);
  }
}

module.exports = { AppError, ValidationError, NotFoundError };
