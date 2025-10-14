import jwt, { JwtPayload } from "jsonwebtoken";

const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;

export const generateAccessToken = (userId: string, roles: string[]) => {
  const payload: JwtPayload = { userId, roles };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
};

export const generateRefreshToken = (userId: string, roles: string[]) => {
  const payload: JwtPayload = { userId, roles };
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_SECRET);
};
