import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/authenticate";

export const authRoutes = Router();

const authLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 5, // 5 tentativas
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Muitas tentativas de login. Tente novamente em 5 minutos.",
  },
});

const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // 10 refresh por 5 minutos
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Muitas tentativas de refresh. Tente novamente em breve.",
  },
});

authRoutes.post("/login", authLimiter, AuthController.login);
authRoutes.post("/refresh", refreshLimiter, AuthController.refresh);
authRoutes.post("/logout", AuthController.logout);
authRoutes.get("/me", AuthController.getMe);
authRoutes.put("/change-email", authenticate, AuthController.changeEmail);
authRoutes.put("/change-password", authenticate, AuthController.changePassword);
