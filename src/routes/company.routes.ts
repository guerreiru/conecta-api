import { Router } from "express";
import { CompanyController } from "../controllers/company.controller";
import { authenticate } from "../middlewares/authenticate";
import { authorizeRoles } from "../middlewares/authorizeRoles";

export const companyRoutes = Router();

companyRoutes.post("/", authenticate, CompanyController.create);
companyRoutes.get(
  "/",
  authenticate,
  authorizeRoles("seupai"),
  CompanyController.getAll
);
companyRoutes.get("/:id", CompanyController.getById);
companyRoutes.put("/:id", authenticate, CompanyController.update);
companyRoutes.delete(
  "/:id",
  authenticate,
  authorizeRoles("seupai"),
  CompanyController.delete
);
