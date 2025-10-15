import { Request, Response } from "express";
import { CityService } from "../services/city.service";
import { HttpError } from "../utils/httpError";

const cityService = new CityService();

export class CityController {
  static async create(req: Request, res: Response) {
    const { name, stateId } = req.body;

    if (!name || name.trim() === "") {
      throw new HttpError("O campo 'name' é obrigatório", 400);
    }

    if (!stateId || stateId.trim() === "") {
      throw new HttpError("O campo 'stateId' é obrigatório", 400);
    }

    const city = await cityService.create({ name, stateId });
    return res.status(201).json(city);
  }

  static async createMany(req: Request, res: Response) {
    const citiesArray = req.body.cities;
    const stateId = req.body.stateId;

    if (!citiesArray || !citiesArray.length) {
      throw new HttpError("A lista de estados é obrigatória", 400);
    }

    if (!stateId || stateId.trim() === "") {
      throw new HttpError("O campo 'stateId' é obrigatório", 400);
    }

    const cities = await cityService.createMany(citiesArray, stateId);
    return res.status(201).json(cities);
  }

  static async getAll(req: Request, res: Response) {
    const name = req.query.name as string;
    const stateId = req.query.stateId as string;

    const cities = await cityService.findAll({ name, stateId });
    return res.json(cities);
  }

  static async getAllByStateId(req: Request, res: Response) {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ message: "Id do estado é obrigatório" });
    }

    const city = await cityService.findAllByStateId(id);

    if (!city) {
      return res.status(404).json({ message: "Cidade não encontrada" });
    }

    return res.json(city);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const city = await cityService.findById(id);

    if (!city) {
      return res.status(404).json({ message: "Cidade não encontrada" });
    }

    return res.json(city);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const updated = await cityService.update(id, req.body);

    if (!updated) {
      return res.status(404).json({ message: "Cidade não encontrada" });
    }

    return res.json(updated);
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;
    const deleted = await cityService.delete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Cidade não encontrada" });
    }

    return res.status(204).send();
  }
}
