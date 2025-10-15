import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";

const authService = new AuthService();

export class AuthController {
  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Credenciais inválidas" });
    }

    if (!password || typeof password !== "string") {
      return res.status(400).json({ message: "Credenciais inválidas" });
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

      return res.json({
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
        user: result.user,
      });
    } catch (error: any) {
      return res.status(400).json({ message: error.message });
    }
  }

  static async refresh(req: Request, res: Response) {
    const token = req.body.refreshToken || req.cookies.refreshToken;

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

      return res.json(result);
    } catch (error: any) {
      console.error(error);

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
}
