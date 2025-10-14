import { UserRole } from "./UserRole";

export interface JwtPayload {
  userId: string;
  roles: string[];
  iat?: number;
  exp?: number;
}
