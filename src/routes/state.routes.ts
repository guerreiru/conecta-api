import { Router } from "express";
import { StateController } from "../controllers/state.controller";

export const stateRoutes = Router();

stateRoutes.post("/", StateController.create);

stateRoutes.post("/createMany", StateController.createMany);

stateRoutes.get("/", StateController.getAll);

stateRoutes.get("/:id", StateController.getById);

stateRoutes.put("/:id", StateController.update);

stateRoutes.delete("/:id", StateController.delete);
