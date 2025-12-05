import jwt, {
  JwtPayload,
  TokenExpiredError,
  JsonWebTokenError,
} from "jsonwebtoken";
import { UserRole } from "../types/UserRole";
import { AUTH_CONFIG } from "../config/auth.config";
import { HttpError } from "./httpError";

const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;

if (!JWT_SECRET || !REFRESH_SECRET) {
  throw new Error("JWT secrets não configurados nas variáveis de ambiente");
}
export interface TokenPayload extends JwtPayload {
  id: string;
  name: string;
  role: UserRole;
}

export type TokenUserData = {
  id: string;
  name: string;
  role: UserRole;
};

export const generateAccessToken = (userData: TokenUserData): string => {
  const payload: Partial<TokenPayload> = {
    id: userData.id,
    name: userData.name,
    role: userData.role,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: AUTH_CONFIG.ACCESS_TOKEN_EXPIRY,
  });
};

export const generateRefreshToken = (userData: TokenUserData): string => {
  const payload: Partial<TokenPayload> = {
    id: userData.id,
    name: userData.name,
    role: userData.role,
  };

  return jwt.sign(payload, REFRESH_SECRET, {
    expiresIn: AUTH_CONFIG.REFRESH_TOKEN_EXPIRY,
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;

    if (!decoded.id || !decoded.role) {
      throw new HttpError(AUTH_CONFIG.ERRORS.TOKEN_INVALID, 403);
    }

    const validRoles: UserRole[] = ["client", "provider", "nanal"];
    if (!validRoles.includes(decoded.role)) {
      throw new HttpError("Role inválida no token", 403);
    }

    return decoded;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new HttpError(AUTH_CONFIG.ERRORS.TOKEN_EXPIRED, 401);
    }
    if (error instanceof JsonWebTokenError) {
      throw new HttpError(AUTH_CONFIG.ERRORS.TOKEN_INVALID, 403);
    }
    throw error;
  }
};

export const verifyRefreshToken = (token: string): TokenPayload => {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET) as TokenPayload;

    if (!decoded.id || !decoded.role) {
      throw new HttpError(AUTH_CONFIG.ERRORS.TOKEN_INVALID, 401);
    }

    const validRoles: UserRole[] = ["client", "provider", "nanal"];
    if (!validRoles.includes(decoded.role)) {
      throw new HttpError("Role inválida no token", 401);
    }

    return decoded;
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      throw new HttpError(AUTH_CONFIG.ERRORS.REFRESH_TOKEN_EXPIRED, 401);
    }
    if (error instanceof JsonWebTokenError) {
      throw new HttpError(AUTH_CONFIG.ERRORS.TOKEN_INVALID, 401);
    }
    throw error;
  }
};
