import { Router } from "express";
import { StateController } from "../controllers/state.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorizeRoles } from "../middlewares/authorizeRoles";

export const stateRoutes = Router();

stateRoutes.post(
  "/",
  authenticate,
  authorizeRoles("nanal"),
  StateController.create
);

stateRoutes.post(
  "/createMany",
  authenticate,
  authorizeRoles("nanal"),
  StateController.createMany
);

stateRoutes.get("/", StateController.getAll);

stateRoutes.get("/:id", StateController.getById);

stateRoutes.put(
  "/:id",
  authenticate,
  authorizeRoles("nanal"),
  StateController.update
);

stateRoutes.delete(
  "/:id",
  authenticate,
  authorizeRoles("nanal"),
  StateController.delete
);
