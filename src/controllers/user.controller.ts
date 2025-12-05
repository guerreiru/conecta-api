import { Request, Response } from "express";
import { UserService } from "../services/user.service";
import { isUUID } from "class-validator";

const userService = new UserService();

export class UserController {
  static async create(req: Request, res: Response) {
    const { name, email, password } = req.body;

    if (!name || name.trim() === "") {
      res.status(400).json({ message: "O campo 'name' é obrigatório" });
    }

    if (!email || email.trim() === "") {
      res.status(400).json({ message: "O campo 'email' é obrigatório" });
    }

    if (!password || password.trim() === "") {
      res.status(400).json({ message: "O campo 'password' é obrigatório" });
    }

    const user = await userService.create({
      name,
      email,
      password,
      ...req.body,
    });

    return res.status(201).json(user);
  }

  static async getAll(req: Request, res: Response) {
    const users = await userService.findAll();
    return res.json(users);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;

    if (!id || !isUUID(id)) {
      return res.status(400).json({
        message: "Id do usuário não informado ou formato inválido",
      });
    }
    const user = await userService.findById(id);

    if (!user) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    return res.json(user);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;

    if (!id || !isUUID(id)) {
      return res.status(400).json({
        message: "Id do usuário não informado ou formato inválido",
      });
    }
    const updated = await userService.update(id, req.body, req.user?.id);

    if (!updated) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    return res.json(updated);
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;

    if (!id || !isUUID(id)) {
      return res.status(400).json({
        message: "Id do usuário não informado ou formato inválido",
      });
    }
    const deleted = await userService.delete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Usuário não encontrado" });
    }

    return res.status(204).send();
  }
}
