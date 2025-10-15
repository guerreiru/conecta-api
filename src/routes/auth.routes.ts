import { Router } from "express";
import { AuthController } from "../controllers/auth.controller";

export const authRoutes = Router();

authRoutes.post("/login", AuthController.login);
authRoutes.post("/refresh", AuthController.refresh);
authRoutes.post("/logout", AuthController.logout);
