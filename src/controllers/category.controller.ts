import { Request, Response } from "express";
import { CategoryService } from "../services/category.service";
import { HttpError } from "../utils/httpError";

const categoryService = new CategoryService();

export class CategoryController {
  static async create(req: Request, res: Response) {
    const { name, description } = req.body;

    if (!name || name.trim() === "") {
      throw new HttpError("O campo 'name' é obrigatório", 400);
    }

    const category = await categoryService.create({ name, description });
    return res.status(201).json(category);
  }

  static async createMany(req: Request, res: Response) {
    const categoriesArray = req.body.categories;

    if (!categoriesArray || !categoriesArray.length) {
      throw new HttpError("A lista de categorias é obrigatória", 400);
    }

    const categories = await categoryService.createMany(categoriesArray);
    return res.status(201).json(categories);
  }

  static async getAll(req: Request, res: Response) {
    const categories = await categoryService.findAll();
    return res.json(categories);
  }

  static async getById(req: Request, res: Response) {
    const { id } = req.params;
    const category = await categoryService.findById(id);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.json(category);
  }

  static async update(req: Request, res: Response) {
    const { id } = req.params;
    const updated = await categoryService.update(id, req.body);

    if (!updated) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.json(updated);
  }

  static async delete(req: Request, res: Response) {
    const { id } = req.params;
    const deleted = await categoryService.delete(id);

    if (!deleted) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.status(204).send();
  }
}
