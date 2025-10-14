import { NextFunction, Request, Response } from "express";
import { JwtPayload } from "../types/JwtPayload";

export function authorizeRoles(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req?.user as JwtPayload | undefined;

    if (!user) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    const hasRole = user.roles.some((role) => allowedRoles.includes(role));

    if (!hasRole) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    next();
  };
}
