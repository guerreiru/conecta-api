import { Request, Response } from "express";
import { ServiceService } from "../services/service.service";
import { HttpError } from "../utils/httpError";
import { isValidPrice } from "../utils/isValidPrice";
import { isUUID } from "class-validator";
import { HighlightLevel } from "../types/HighlightLevel";

const serviceService = new ServiceService();

export class ServiceController {
  static async create(req: Request, res: Response) {
    const {
      title,
      price,
      typeOfChange,
      description,
      categoryId,
      userId,
      serviceType,
      requestHighlight,
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

    if (!userId) {
      throw new HttpError("Id do usuário é obrigatório", 400);
    }

    const service = await serviceService.create({
      title,
      price,
      description,
      categoryId,
      userId,
      typeOfChange,
      serviceType,
      requestHighlight: requestHighlight === true,
    });
    return res.status(201).json(service);
  }

  static async getAll(req: Request, res: Response) {
    const services = await serviceService.findAll();
    return res.json(services);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;

    if (!id || !isUUID(id)) {
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
    const {
      stateId,
      cityId,
      categoryId,
      searchTerm,
      page,
      limit,
      priceMin,
      priceMax,
      minRating,
      sortBy,
      serviceType,
    } = req.query;

    const results = await serviceService.searchServices({
      stateId: stateId as string,
      cityId: cityId as string,
      categoryId: categoryId as string,
      searchTerm: searchTerm as string,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 10,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
      minRating: minRating ? Number(minRating) : undefined,
      sortBy:
        (sortBy as
          | "relevance"
          | "price_asc"
          | "price_desc"
          | "rating_desc"
          | "newest") || "relevance",
      serviceType: (serviceType as "all" | "in_person" | "online") || undefined,
    });

    return res.json(results);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;

    if (!id || !isUUID(id)) {
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

    if (!id || !isUUID(id)) {
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

  static async updateHighlight(req: Request, res: Response) {
    const { id } = req.params;
    const { isHighlighted, highlightLevel } = req.body;

    if (!id || !isUUID(id)) {
      return res.status(400).json({
        message: "Id do serviço não informado ou formato inválido",
      });
    }

    if (typeof isHighlighted !== "boolean") {
      return res.status(400).json({
        message: "isHighlighted deve ser um boolean",
      });
    }

    if (
      isHighlighted &&
      !Object.values(HighlightLevel).includes(highlightLevel)
    ) {
      return res.status(400).json({
        message: "highlightLevel incorreto",
      });
    }

    try {
      const service = await serviceService.updateHighlight(
        id,
        isHighlighted,
        highlightLevel
      );

      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      return res.json(service);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Erro ao atualizar destaque";
      return res.status(statusCode).json({ message });
    }
  }

  static async activateService(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError("Usuário não autenticado", 401);
    }

    if (!id || !isUUID(id)) {
      return res.status(400).json({
        message: "Id do serviço não informado ou formato inválido",
      });
    }

    try {
      const service = await serviceService.activateService(id, userId);

      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      return res.json(service);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Erro ao ativar serviço";
      return res.status(statusCode).json({ message });
    }
  }

  static async deactivateService(req: Request, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError("Usuário não autenticado", 401);
    }

    if (!id || !isUUID(id)) {
      return res.status(400).json({
        message: "Id do serviço não informado ou formato inválido",
      });
    }

    try {
      const service = await serviceService.deactivateService(id, userId);

      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }

      return res.json(service);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Erro ao desativar serviço";
      return res.status(statusCode).json({ message });
    }
  }

  static async getInactiveServices(req: Request, res: Response) {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError("Usuário não autenticado", 401);
    }

    try {
      const services = await serviceService.findInactiveByProvider(userId);
      return res.json(services);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Erro ao buscar serviços inativos";
      return res.status(statusCode).json({ message });
    }
  }

  /**
   * Usuário ativa/desativa destaque em serviço próprio
   * PATCH /services/:id/highlight
   * Body: { enable: boolean }
   */
  static async toggleHighlight(req: Request, res: Response) {
    const { id } = req.params;
    const { enable } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError("Usuário não autenticado", 401);
    }

    if (!id || !isUUID(id)) {
      return res.status(400).json({
        message: "Id do serviço não informado ou formato inválido",
      });
    }

    if (typeof enable !== "boolean") {
      return res.status(400).json({
        message: "Campo 'enable' deve ser um booleano",
      });
    }

    try {
      const service = await serviceService.toggleHighlight(id, userId, enable);
      return res.json(service);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Erro ao modificar destaque";
      return res.status(statusCode).json({ message });
    }
  }

  /**
   * Retorna estatísticas de destaques do usuário
   * GET /services/highlights/stats
   */
  static async getHighlightStats(req: Request, res: Response) {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError("Usuário não autenticado", 401);
    }

    try {
      const stats = await serviceService.getHighlightStats(userId);
      return res.json(stats);
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const message = error.message || "Erro ao buscar estatísticas";
      return res.status(statusCode).json({ message });
    }
  }
}
