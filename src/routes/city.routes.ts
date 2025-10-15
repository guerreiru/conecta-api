import { Router } from "express";
import { CityController } from "../controllers/city.controller";
import { authorizeRoles } from "../middlewares/authorizeRoles";
import { authenticate } from "../middlewares/authenticate";

export const cityRoutes = Router();

cityRoutes.post(
  "/",
  authenticate,
  authorizeRoles("seupai"),
  CityController.create
);

cityRoutes.post(
  "/createMany",
  authenticate,
  authorizeRoles("seupai"),
  CityController.createMany
);

cityRoutes.get("/", CityController.getAll);

cityRoutes.get("/state/:id", CityController.getAllByStateId);

cityRoutes.get("/:id", CityController.getById);

cityRoutes.put(
  "/:id",
  authenticate,
  authorizeRoles("seupai"),
  CityController.update
);

cityRoutes.delete(
  "/:id",
  authenticate,
  authorizeRoles("seupai"),
  CityController.delete
);
