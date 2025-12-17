import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../utils/jwt';
import { AuthenticatedRequest } from '../types';

/**
 * Authentifizierungs-Middleware
 * Prüft JWT-Token und fügt User-Informationen zum Request hinzu
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Token aus Authorization-Header extrahieren
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({
        success: false,
        error: 'No authorization token provided',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer '

    // Token verifizieren
    const payload = verifyToken(token);

    // User-Informationen zum Request hinzufügen
    (request as AuthenticatedRequest).user = {
      id: payload.userId,
      email: payload.email,
      username: payload.username,
      isAdmin: payload.isAdmin,
    };
  } catch (error) {
    return reply.status(401).send({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}

/**
 * Admin-Middleware
 * Prüft ob der Benutzer Admin-Rechte hat
 */
export async function adminMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const user = (request as AuthenticatedRequest).user;

  if (!user || !user.isAdmin) {
    return reply.status(403).send({
      success: false,
      error: 'Admin access required',
    });
  }
}
