import { Router } from "express";
import { UserController } from "../controllers/user.controller";

export const userRoutes = Router();

userRoutes.post("/", UserController.create);
userRoutes.get("/", UserController.getAll);
userRoutes.get("/:id", UserController.getById);
userRoutes.put("/:id", UserController.update);
userRoutes.delete("/:id", UserController.delete);
