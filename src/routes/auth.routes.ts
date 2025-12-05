import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/authenticate";
import { authLimiter, refreshLimiter } from "../middlewares/rateLimit";

export const authRoutes = Router();

authRoutes.post("/login", authLimiter, AuthController.login);
authRoutes.post("/refresh", refreshLimiter, AuthController.refresh);
authRoutes.post("/logout", AuthController.logout);
authRoutes.get("/me", AuthController.getMe);
authRoutes.put("/change-email", authenticate, AuthController.changeEmail);
authRoutes.put("/change-password", authenticate, AuthController.changePassword);
