import { Request, Response } from "express";
import { UserService } from "../services/user.service";

const userService = new UserService();

export class UserController {
  static async create(req: Request, res: Response) {
    const { name, email, password, profileType } = req.body;

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
      profileType: "client",
    });

    return res.status(201).json(user);
  }

  static async getAll(req: Request, res: Response) {
    const users = await userService.findAll();
    return res.json(users);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const user = await userService.findById(id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const updated = await userService.update(id, req.body);

    if (!updated) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(updated);
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;
    const deleted = await userService.delete(id);

    if (!deleted) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(204).send();
  }
}
