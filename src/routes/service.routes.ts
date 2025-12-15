import { Router } from "express";
import { ServiceController } from "../controllers/service.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorizeRoles } from "../middlewares/authorizeRoles";

export const serviceRoutes = Router();

serviceRoutes.post("/", ServiceController.create);
serviceRoutes.get("/", ServiceController.getAll);
serviceRoutes.get("/search", ServiceController.search);
serviceRoutes.get(
  "/count",
  authenticate,
  authorizeRoles("nanal"),
  ServiceController.count
);
serviceRoutes.get("/provider/:providerId", ServiceController.getByProvider);

// Rotas protegidas - gerenciar ativação de serviços
serviceRoutes.patch(
  "/:id/activate",
  authenticate,
  ServiceController.activateService
);

serviceRoutes.patch(
  "/:id/deactivate",
  authenticate,
  ServiceController.deactivateService
);

serviceRoutes.get(
  "/inactive/me",
  authenticate,
  ServiceController.getInactiveServices
);

// ROTAS DE DESTAQUE DESABILITADAS - Serão lançadas futuramente
// Rotas de destaque - usuário gerencia seus próprios serviços
// serviceRoutes.patch(
//   "/:id/highlight",
//   authenticate,
//   ServiceController.toggleHighlight
// );

// serviceRoutes.get(
//   "/highlights/stats",
//   authenticate,
//   ServiceController.getHighlightStats
// );

// Rota protegida - apenas admins (override manual de destaque)
serviceRoutes.patch(
  "/:id/admin/highlight",
  authenticate,
  authorizeRoles("nanal"),
  ServiceController.updateHighlight
);

// Rotas genéricas devem vir por último para evitar conflitos
serviceRoutes.get("/:id", ServiceController.getById);
serviceRoutes.put("/:id", ServiceController.update);
serviceRoutes.delete("/:id", ServiceController.delete);
