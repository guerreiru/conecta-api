import { Request, Response, NextFunction } from "express";
import { verifyAccessToken, TokenPayload } from "../utils/token";
import { AUTH_CONFIG } from "../config/auth.config";

export function authenticate(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  }

  if (!token && req.cookies?.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    return res.status(401).json({
      message: AUTH_CONFIG.ERRORS.TOKEN_MISSING,
      code: "TOKEN_MISSING",
    });
  }

  try {
    const decoded: TokenPayload = verifyAccessToken(token);

    req.user = {
      id: decoded.id,
      roles: [decoded.role],
    };

    next();
  } catch (error: any) {
    const statusCode = error.statusCode || 403;
    const message = error.message || AUTH_CONFIG.ERRORS.TOKEN_INVALID;

    const code =
      message === AUTH_CONFIG.ERRORS.TOKEN_EXPIRED
        ? "TOKEN_EXPIRED"
        : "TOKEN_INVALID";

    return res.status(statusCode).json({
      message,
      code,
    });
  }
}
