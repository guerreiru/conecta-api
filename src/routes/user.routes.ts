import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middlewares/authenticate";

export const userRoutes = Router();

userRoutes.post("/", UserController.create);
userRoutes.get("/:id", UserController.getById);
userRoutes.get("/", UserController.getAll);
userRoutes.put("/:id", UserController.update);
userRoutes.delete("/:id", authenticate, UserController.delete);
