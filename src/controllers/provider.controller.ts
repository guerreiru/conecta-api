import { Request, Response } from "express";
import { ProviderService } from "../services/provider.service";

const providerService = new ProviderService();

export class ProviderController {
  static async create(req: Request, res: Response) {
    const provider = await providerService.create(req.body);
    return res.status(201).json(provider);
  }

  static async getAll(req: Request, res: Response) {
    const providers = await providerService.findAll();
    return res.json(providers);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const provider = await providerService.findById(id);

    if (!provider) {
      return res.status(404).json({ message: "Provider not found" });
    }
    return res.json(provider);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const updated = await providerService.update(id, req.body);

    if (!updated) {
      return res.status(404).json({ message: "Provider not found" });
    }
    return res.json(updated);
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;
    const deleted = await providerService.delete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Provider not found" });
    }
    return res.status(204).send();
  }
}
