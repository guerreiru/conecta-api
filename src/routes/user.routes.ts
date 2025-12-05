import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorizeRoles } from "../middlewares/authorizeRoles";

export const userRoutes = Router();

userRoutes.post("/", UserController.create);
userRoutes.get("/:id", UserController.getById);
userRoutes.get("/", UserController.getAll);
userRoutes.put("/:id", authenticate, UserController.update);
userRoutes.delete(
  "/:id",
  authenticate,
  authorizeRoles("nanal"),
  UserController.delete
);
