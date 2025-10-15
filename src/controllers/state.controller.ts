import { Request, Response } from "express";
import { StateService } from "../services/state.service";
import { HttpError } from "../utils/httpError";
import { isUUID } from "class-validator";

const stateService = new StateService();

export class StateController {
  static async create(req: Request, res: Response) {
    const { name, acronym } = req.body;

    if (!name || name.trim() === "") {
      throw new HttpError("O campo 'name' é obrigatório", 400);
    }

    if (!acronym || acronym.trim() === "") {
      throw new HttpError("O campo 'acronym' é obrigatório", 400);
    }

    const state = await stateService.create({ name, acronym });
    return res.status(201).json(state);
  }

  static async createMany(req: Request, res: Response) {
    const statesArray = req.body.states;

    if (!statesArray || !statesArray.length) {
      throw new HttpError("A lista de estados é obrigatória", 400);
    }

    const states = await stateService.createMany(statesArray);
    return res.status(201).json(states);
  }

  static async getAll(req: Request, res: Response) {
    const states = await stateService.findAll();
    return res.json(states);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;

    if (!id || !isUUID(id)) {
      return res.status(400).json({
        message: "Id do estado não informado ou formato inválido",
      });
    }

    const state = await stateService.findById(id);

    if (!state) {
      return res.status(404).json({ message: "Estado não encontrado" });
    }

    return res.json(state);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;

    if (!id || !isUUID(id)) {
      return res.status(400).json({
        message: "Id do estado não informado ou formato inválido",
      });
    }

    const updated = await stateService.update(id, req.body);

    if (!updated) {
      return res.status(404).json({ message: "Estado não encontrado" });
    }

    return res.json(updated);
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;

    if (!id || !isUUID(id)) {
      return res.status(400).json({
        message: "Id do estado não informado ou formato inválido",
      });
    }

    const deleted = await stateService.delete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Estado não encontrado" });
    }

    return res.status(204).send();
  }
}
