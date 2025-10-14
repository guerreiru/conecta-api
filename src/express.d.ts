import { User } from "../entities/User";

export interface AuthenticatedUser extends Partial<User> {
  id: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
