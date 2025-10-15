import jwt, { JwtPayload } from "jsonwebtoken";
import { UserRole } from "../types/UserRole";

const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET!;
const REFRESH_SECRET = process.env.REFRESH_TOKEN_SECRET!;

type UserData = {
  id: string;
  name: string;
  roles: UserRole[];
};

export const generateAccessToken = ({ id, name, roles }: UserData) => {
  const payload: JwtPayload = { id, name, roles };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
};

export const generateRefreshToken = ({ id, name, roles }: UserData) => {
  const payload: JwtPayload = { id, name, roles };
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
};

export const verifyRefreshToken = (token: string) => {
  return jwt.verify(token, REFRESH_SECRET);
};
