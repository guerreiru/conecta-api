import { Router } from "express";
import { StateController } from "../controllers/state.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorizeRoles } from "../middlewares/authorizeRoles";

export const stateRoutes = Router();

stateRoutes.post(
  "/",
  authenticate,
  authorizeRoles("seupai"),
  StateController.create
);

stateRoutes.post(
  "/createManyauthenticate",
  authenticate,
  authorizeRoles("seupai"),
  StateController.createMany
);

stateRoutes.get("/", StateController.getAll);

stateRoutes.get("/:id", StateController.getById);

stateRoutes.put(
  "/:id",
  authenticate,
  authorizeRoles("seupai"),
  StateController.update
);

stateRoutes.delete(
  "/:id",
  authenticate,
  authorizeRoles("seupai"),
  StateController.delete
);
