import { Router } from "express";
import { CategoryController } from "../controllers/category.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorizeRoles } from "../middlewares/authorizeRoles";

export const categoryRoutes = Router();

categoryRoutes.post(
  "/",
  authenticate,
  authorizeRoles("nanal"),
  CategoryController.create
);

categoryRoutes.post(
  "/createMany",
  authenticate,
  authorizeRoles("nanal"),
  CategoryController.createMany
);

categoryRoutes.get("/", CategoryController.getAll);

categoryRoutes.get("/:id", CategoryController.getById);

categoryRoutes.put(
  "/:id",
  authenticate,
  authorizeRoles("nanal"),
  CategoryController.update
);

categoryRoutes.delete(
  "/:id",
  authenticate,
  authorizeRoles("nanal"),
  CategoryController.delete
);
