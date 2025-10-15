import { Request, Response } from "express";
import { CompanyService } from "../services/company.service";
import { isUUID } from "class-validator";

const companyService = new CompanyService();

export class CompanyController {
  static async create(req: Request, res: Response) {
    const company = await companyService.create(req.body);
    return res.status(201).json(company);
  }

  static async getAll(req: Request, res: Response) {
    const companies = await companyService.findAll();
    return res.json(companies);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;

    if (!id || !isUUID(id)) {
      return res
        .status(400)
        .json({ message: "Id da empresa não informado ou formato inválido" });
    }

    const company = await companyService.findById(id);

    if (!company) {
      return res.status(404).json({ message: "Empresa não encontrada" });
    }
    return res.json(company);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;

    if (!id || !isUUID(id)) {
      return res
        .status(400)
        .json({ message: "Id da empresa não informado ou formato inválido" });
    }

    const updated = await companyService.update(id, req.body);

    if (!updated) {
      return res.status(404).json({ message: "Empresa não encontrada" });
    }

    return res.json(updated);
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;

    if (!id || !isUUID(id)) {
      return res
        .status(400)
        .json({ message: "Id da empresa não informado ou formato inválido" });
    }

    const deleted = await companyService.delete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Empresa não encontrada" });
    }

    return res.status(204).send();
  }
}
