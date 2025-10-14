import { Router } from "express";
import { ServiceController } from "../controllers/service.controller";

export const serviceRoutes = Router();

serviceRoutes.post("/", ServiceController.create);
serviceRoutes.get("/", ServiceController.getAll);
serviceRoutes.get("/search", ServiceController.search);
serviceRoutes.get("/:id", ServiceController.getById);
serviceRoutes.get("/provider/:providerId", ServiceController.getByProvider);
serviceRoutes.put("/:id", ServiceController.update);
serviceRoutes.delete("/:id", ServiceController.delete);
