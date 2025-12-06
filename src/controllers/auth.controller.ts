import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import {
  getRefreshTokenCookieOptions,
  getAccessTokenCookieOptions,
} from "../utils/cookie";
import { AUTH_CONFIG } from "../config/auth.config";

const authService = new AuthService();
export class AuthController {
  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    const validation = AuthController.validateLoginInput(email, password);
    if (!validation.valid) {
      return res.status(400).json({ message: validation.message });
    }

    try {
      const result = await authService.login(email, password);

      res.cookie(
        "refreshToken",
        result.refreshToken,
        getRefreshTokenCookieOptions()
      );

      res.cookie(
        "accessToken",
        result.accessToken,
        getAccessTokenCookieOptions()
      );

      return res.json({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Erro ao realizar login";
      return res.status(statusCode).json({ message });
    }
  }

  static async refresh(req: Request, res: Response) {
    const token = req.cookies.refreshToken || req.body.refreshToken;

    if (!token) {
      return res
        .status(401)
        .json({ message: AUTH_CONFIG.ERRORS.TOKEN_MISSING });
    }

    try {
      const result = await authService.refresh(token);

      res.cookie(
        "refreshToken",
        result.refreshToken,
        getRefreshTokenCookieOptions()
      );

      res.cookie(
        "accessToken",
        result.accessToken,
        getAccessTokenCookieOptions()
      );

      return res.json({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 403;
      const message = error.message || "Erro ao renovar token";
      return res.status(statusCode).json({ message });
    }
  }

  static async logout(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      res.clearCookie("refreshToken");
      res.clearCookie("accessToken");
      return res.status(200).json({ message: "Logout realizado com sucesso" });
    }

    try {
      await authService.logout(refreshToken);
      res.clearCookie("refreshToken");
      res.clearCookie("accessToken");
      return res.status(200).json({ message: "Logout realizado com sucesso" });
    } catch (error: any) {
      res.clearCookie("refreshToken");
      res.clearCookie("accessToken");
      return res.status(200).json({ message: "Logout realizado com sucesso" });
    }
  }

  static async getMe(req: Request, res: Response) {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
      return res
        .status(401)
        .json({ message: AUTH_CONFIG.ERRORS.TOKEN_MISSING });
    }

    try {
      const result = await authService.getMe(refreshToken);

      res.cookie(
        "accessToken",
        result.accessToken,
        getAccessTokenCookieOptions()
      );

      return res.json({
        accessToken: result.accessToken,
        user: result.user,
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 401;
      const message = error.message || AUTH_CONFIG.ERRORS.UNAUTHORIZED;
      return res.status(statusCode).json({ message });
    }
  }

  static async changeEmail(req: Request, res: Response) {
    const userId = req.user?.id;
    const { newEmail, currentPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    if (!newEmail || typeof newEmail !== "string") {
      return res.status(400).json({ message: "Novo email é obrigatório" });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(newEmail)) {
      return res.status(400).json({ message: "Formato de email inválido" });
    }

    if (!currentPassword || typeof currentPassword !== "string") {
      return res.status(400).json({ message: "Senha atual é obrigatória" });
    }

    try {
      const result = await authService.changeEmail(
        userId,
        newEmail,
        currentPassword
      );

      res.cookie(
        "refreshToken",
        result.refreshToken,
        getRefreshTokenCookieOptions()
      );

      res.cookie(
        "accessToken",
        result.accessToken,
        getAccessTokenCookieOptions()
      );

      return res.json({
        accessToken: result.accessToken,
        user: result.user,
        message: "Email atualizado com sucesso",
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Erro ao atualizar email";
      return res.status(statusCode).json({ message });
    }
  }

  static async changePassword(req: Request, res: Response) {
    const userId = req.user?.id;
    const { currentPassword, newPassword } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Usuário não autenticado" });
    }

    if (!currentPassword || typeof currentPassword !== "string") {
      return res.status(400).json({ message: "Senha atual é obrigatória" });
    }

    if (!newPassword || typeof newPassword !== "string") {
      return res.status(400).json({ message: "Nova senha é obrigatória" });
    }

    if (newPassword.length < 6) {
      return res
        .status(400)
        .json({ message: "Nova senha deve ter no mínimo 6 caracteres" });
    }

    try {
      const result = await authService.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      res.cookie(
        "refreshToken",
        result.refreshToken,
        getRefreshTokenCookieOptions()
      );

      res.cookie(
        "accessToken",
        result.accessToken,
        getAccessTokenCookieOptions()
      );

      return res.json({
        accessToken: result.accessToken,
        user: result.user,
        message: "Senha atualizada com sucesso",
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Erro ao atualizar senha";
      return res.status(statusCode).json({ message });
    }
  }

  private static validateLoginInput(
    email: unknown,
    password: unknown
  ): { valid: boolean; message?: string } {
    if (!email || typeof email !== "string") {
      return {
        valid: false,
        message: "Email é obrigatório e deve ser uma string",
      };
    }

    if (email.trim().length === 0) {
      return { valid: false, message: "Email não pode estar vazio" };
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return { valid: false, message: "Formato de email inválido" };
    }

    if (!password || typeof password !== "string") {
      return {
        valid: false,
        message: "Senha é obrigatória e deve ser uma string",
      };
    }

    if (password.length === 0) {
      return { valid: false, message: "Senha não pode estar vazia" };
    }

    if (password.length < 6) {
      return { valid: false, message: "Senha deve ter no mínimo 6 caracteres" };
    }

    return { valid: true };
  }
}
