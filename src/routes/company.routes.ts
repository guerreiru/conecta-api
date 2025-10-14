import { Router } from "express";
import { CompanyController } from "../controllers/company.controller";

export const companyRoutes = Router();

companyRoutes.post("/", CompanyController.create);
companyRoutes.get("/", CompanyController.getAll);
companyRoutes.get("/:id", CompanyController.getById);
companyRoutes.put("/:id", CompanyController.update);
companyRoutes.delete("/:id", CompanyController.delete);
