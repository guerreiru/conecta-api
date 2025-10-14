import { Router } from "express";
import { CityController } from "../controllers/city.controller";

export const cityRoutes = Router();

cityRoutes.post("/", CityController.create);
cityRoutes.post("/createMany", CityController.createMany);
cityRoutes.get("/", CityController.getAll);
cityRoutes.get("/state/:id", CityController.getAllByStateId);
cityRoutes.get("/:id", CityController.getById);
cityRoutes.put("/:id", CityController.update);
cityRoutes.delete("/:id", CityController.delete);
