import { Router } from "express";
import { UserController } from "../controllers/user.controller";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { authenticate } from "../middlewares/authenticate";

export const userRoutes = Router();

userRoutes.post("/", UserController.create);
userRoutes.get(
  "/",
  authenticate,
  authorizeRoles("seupai"),
  UserController.getAll
);
userRoutes.get("/:id", UserController.getById);
userRoutes.put("/:id", authenticate, UserController.update);
userRoutes.delete(
  "/:id",
  authenticate,
  authorizeRoles("seupai"),
  UserController.delete
);
