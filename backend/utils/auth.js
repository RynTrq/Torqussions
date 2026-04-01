import jwt from 'jsonwebtoken';
import { HttpError } from './http-error.js';

const BEARER_PREFIX = 'Bearer ';

const extractBearerToken = (authorizationHeader) => {
  if (!authorizationHeader || !authorizationHeader.startsWith(BEARER_PREFIX)) {
    return null;
  }

  return authorizationHeader.slice(BEARER_PREFIX.length).trim();
};

export const getTokenFromRequest = (req) =>
  extractBearerToken(req.headers?.authorization) || req.cookies?.token || null;

export const getTokenFromSocket = (socket) =>
  socket.handshake.auth?.token ||
  extractBearerToken(socket.handshake.headers?.authorization) ||
  null;

export const getProjectIdFromSocket = (socket) =>
  socket.handshake.auth?.projectId || socket.handshake.query?.projectId || null;

export const verifyAccessToken = (token) => {
  if (!token) {
    throw new HttpError(401, 'Authentication required');
  }

  if (!process.env.JWT_SECRET) {
    throw new HttpError(500, 'JWT secret is not configured');
  }

  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new HttpError(401, 'Invalid or expired token');
  }
};
