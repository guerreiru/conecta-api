import { Router } from "express";
import { CityController } from "../controllers/city.controller";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { authenticate } from "../middlewares/authenticate";

export const cityRoutes = Router();

cityRoutes.post("/", CityController.create);

cityRoutes.post("/createMany", CityController.createMany);

cityRoutes.get("/", CityController.getAll);

cityRoutes.get("/state/:id", CityController.getAllByStateId);

cityRoutes.get("/:id", CityController.getById);

cityRoutes.put("/:id", CityController.update);

cityRoutes.delete("/:id", CityController.delete);
