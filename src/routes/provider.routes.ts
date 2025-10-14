import { Router } from "express";
import { ProviderController } from "../controllers/provider.controller";

export const providerRoutes = Router();

providerRoutes.post("/", ProviderController.create);
providerRoutes.get("/", ProviderController.getAll);
providerRoutes.get("/:id", ProviderController.getById);
providerRoutes.put("/:id", ProviderController.update);
providerRoutes.delete("/:id", ProviderController.delete);
