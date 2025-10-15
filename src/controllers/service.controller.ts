import { Request, Response } from "express";
import { ServiceService } from "../services/service.service";
import { HttpError } from "../utils/httpError";
import { isValidPrice } from "../utils/isValidPrice";
import { isUUID } from "class-validator";

const serviceService = new ServiceService();

export class ServiceController {
  static async create(req: Request, res: Response) {
    const {
      title,
      price,
      typeOfChange,
      description,
      categoryId,
      companyId,
      providerId,
    } = req.body;

    if (!typeOfChange || typeOfChange.trim() === "") {
      throw new HttpError("O tipo de cobrança é obrigatório");
    }

    if (!title || title.trim() === "") {
      throw new HttpError("O nome do serviço é obrigatório");
    }

    if (!price) {
      throw new HttpError("O preço do serviço é obrigatório");
    }

    if (!isValidPrice(price)) {
      throw new HttpError("O preço deve ser um número válido");
    }

    if (!categoryId || categoryId.trim() === "") {
      throw new HttpError("A categoria é obrigatória");
    }

    if (!providerId && !companyId) {
      throw new HttpError(
        "O serviço deve pertencer a uma empresa ou um prestador de serviço",
        400
      );
    }

    const service = await serviceService.create({
      title,
      price,
      description,
      categoryId,
      companyId,
      providerId,
      typeOfChange,
    });
    return res.status(201).json(service);
  }

  static async getAll(req: Request, res: Response) {
    const services = await serviceService.findAll();
    return res.json(services);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;

    if (!id || isUUID(id)) {
      return res.status(400).json({
        message: "Id do serviço não informado ou formato inválido",
      });
    }

    const service = await serviceService.findById(id);

    if (!service) {
      return res.status(404).json({ message: "Serviço não encontrado" });
    }

    return res.json(service);
  }

  static async search(req: Request, res: Response) {
    const { stateId, cityId, categoryId, searchTerm } = req.query;

    if (!stateId || !cityId) {
      return res
        .status(400)
        .json({ message: "stateId e cityId são obrigatórios" });
    }

    const results = await serviceService.searchServices({
      stateId: stateId as string,
      cityId: cityId as string,
      categoryId: categoryId as string,
      searchTerm: searchTerm as string,
    });

    return res.json(results);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;

    if (!id || isUUID(id)) {
      return res.status(400).json({
        message: "Id do serviço não informado ou formato inválido",
      });
    }

    const updated = await serviceService.update(id, req.body);

    if (!updated) {
      return res.status(404).json({ message: "Serviço não encontrado" });
    }

    return res.json(updated);
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;

    if (!id || isUUID(id)) {
      return res.status(400).json({
        message: "Id do serviço não informado ou formato inválido",
      });
    }

    const deleted = await serviceService.delete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Serviço não encontrado" });
    }

    return res.status(204).send();
  }

  static async getByProvider(req: Request, res: Response) {
    const { providerId } = req.params;
    const services = await serviceService.findByProvider(providerId);
    return res.json(services);
  }
}
