import { Router } from "express";
import { CategoryController } from "../controllers/category.controller";

export const categoryRoutes = Router();

categoryRoutes.post("/", CategoryController.create);
categoryRoutes.post("/createMany", CategoryController.createMany);
categoryRoutes.get("/", CategoryController.getAll);
categoryRoutes.get("/:id", CategoryController.getById);
categoryRoutes.put("/:id", CategoryController.update);
categoryRoutes.delete("/:id", CategoryController.delete);
