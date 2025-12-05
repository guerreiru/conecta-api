import { Router } from "express";
import { ServiceController } from "../controllers/service.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorizeRoles } from "../middlewares/authorizeRoles";

export const serviceRoutes = Router();

serviceRoutes.post("/", ServiceController.create);
serviceRoutes.get("/", ServiceController.getAll);
serviceRoutes.get("/search", ServiceController.search);
serviceRoutes.get("/:id", ServiceController.getById);
serviceRoutes.get("/provider/:providerId", ServiceController.getByProvider);
serviceRoutes.put("/:id", ServiceController.update);
serviceRoutes.delete("/:id", ServiceController.delete);

// Rota protegida - apenas admins podem gerenciar destaque
serviceRoutes.patch(
  "/:id/highlight",
  authenticate,
  authorizeRoles("nanal"),
  ServiceController.updateHighlight
);
