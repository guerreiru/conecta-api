import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { AppDataSource } from "../database";
import { verify } from "jsonwebtoken";
import { User } from "../entities/User";

const authService = new AuthService();

export class AuthController {
  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Os campos 'email' e 'password' são obrigatórios" });
    }

    try {
      const result = await authService.login(email, password);

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async refresh(req: Request, res: Response) {
    const token = req.cookies.refreshToken;

    if (!token) {
      return res.status(401).json({ message: "Token ausente" });
    }

    try {
      const result = await authService.refresh(token);

      res.cookie("refreshToken", result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      return res.json({ accessToken: result.accessToken });
    } catch (error: any) {
      return res.status(403).json({ message: error.message });
    }
  }

  static async logout(req: Request, res: Response) {
    const { refreshToken } = req.cookies;

    if (!refreshToken) {
      return res.status(400).json({ message: "Nenhum token encontrado" });
    }

    try {
      await authService.logout(refreshToken);
      res.clearCookie("refreshToken");
      return res.status(200).json({ message: "Logout realizado com sucesso" });
    } catch (error: any) {
      return res.status(500).json({ message: "Erro ao realizar logout" });
    }
  }

  static async me(req: Request, res: Response) {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ message: "Token não fornecido" });
    }

    const token = authHeader.split(" ")[1];

    try {
      const decoded: any = verify(token, process.env.ACCESS_TOKEN_SECRET!);

      const userRepository = AppDataSource.getRepository(User);
      const user = await userRepository.findOne({
        where: { id: decoded.userId },
        relations: {
          profiles: {
            provider: true,
            company: true,
            user: true,
          },
        },
      });

      if (!user) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }

      const roles = user.profiles.map((profile) => profile.type);

      return res.json({
        ...user,
        roles,
      });
    } catch (error: any) {
      return res.status(401).json({ message: "Token inválido ou expirado" });
    }
  }
}
