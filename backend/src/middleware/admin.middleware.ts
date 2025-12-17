import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest } from '../types';

/**
 * Middleware to check if user is an admin
 */
export async function adminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authRequest = request as AuthenticatedRequest;

  // Check if user is authenticated
  if (!authRequest.user) {
    return reply.status(401).send({
      success: false,
      error: 'Authentication required',
    });
  }

  // Check if user is admin
  if (!authRequest.user.isAdmin) {
    return reply.status(403).send({
      success: false,
      error: 'Admin access required',
    });
  }
}
