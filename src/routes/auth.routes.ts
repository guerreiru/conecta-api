import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/authenticate";

export const authRoutes = Router();

authRoutes.post("/login", AuthController.login);
authRoutes.post("/refresh-token", AuthController.refresh);
authRoutes.post("/logout", AuthController.logout);
authRoutes.get("/me", authenticate, AuthController.me);
