import { Router } from "express";
import { CategoryController } from "../controllers/category.controller";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { authenticate } from "../middlewares/authenticate";

export const categoryRoutes = Router();

categoryRoutes.post(
  "/",
  authenticate,
  authorizeRoles("seupai"),
  CategoryController.create
);

categoryRoutes.post(
  "/createMany",
  authenticate,
  authorizeRoles("seupai"),
  CategoryController.createMany
);

categoryRoutes.get("/", CategoryController.getAll);

categoryRoutes.get("/:id", CategoryController.getById);

categoryRoutes.put(
  "/:id",
  authenticate,
  authorizeRoles("seupai"),
  CategoryController.update
);

categoryRoutes.delete(
  "/:id",
  authenticate,
  authorizeRoles("seupai"),
  CategoryController.delete
);
