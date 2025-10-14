import { Router } from "express";
import { ProfileController } from "../controllers/profile.controller";

export const profileRoutes = Router();

profileRoutes.get("/", ProfileController.getAll);
profileRoutes.get("/:id", ProfileController.getById);
