import { FastifyError, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Globaler Error Handler
 */
export function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // Log error
  console.error('Error:', {
    url: request.url,
    method: request.method,
    error: error.message,
    stack: error.stack,
  });

  // Zod Validation Errors
  if (error.validation) {
    return reply.status(400).send({
      success: false,
      error: 'Validation failed',
      details: error.validation,
    });
  }

  // HTTP Error Codes
  const statusCode = error.statusCode || 500;
  const message =
    statusCode === 500 ? 'Internal server error' : error.message;

  reply.status(statusCode).send({
    success: false,
    error: message,
  });
}
