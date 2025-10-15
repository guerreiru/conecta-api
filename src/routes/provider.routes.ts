import { Router } from "express";
import { ProviderController } from "../controllers/provider.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorizeRoles } from "../middlewares/authorizeRoles";

export const providerRoutes = Router();

providerRoutes.post("/", authenticate, ProviderController.create);

providerRoutes.get(
  "/",
  authenticate,
  authorizeRoles("seupai"),
  ProviderController.getAll
);

providerRoutes.get("/:id", ProviderController.getById);

providerRoutes.put(
  "/:id",
  authenticate,
  authorizeRoles("seupai"),
  ProviderController.update
);

providerRoutes.delete(
  "/:id",
  authenticate,
  authorizeRoles("seupai"),
  ProviderController.delete
);
