import { AppDataSource } from "../database";
import { Category } from "../entities/Category";
import { HttpError } from "../utils/errors/HttpError";

export class CategoryService {
  private categoryRepository = AppDataSource.getRepository(Category);

  async create({
    name,
    description,
  }: {
    name: string;
    description?: string;
  }): Promise<Category> {
    const nameLowerCase = name.toLowerCase();

    const existingCategory = await this.findByName(nameLowerCase);

    if (existingCategory) {
      throw new HttpError("Esta categoria já está cadastrada", 409);
    }

    const category = this.categoryRepository.create({
      name: nameLowerCase,
      description,
    });

    return await this.categoryRepository.save(category);
  }

  async createMany(
    categories: Category[]
  ): Promise<{ success: Category[]; errors: any[] }> {
    const success: Category[] = [];
    const errors: any[] = [];

    for (const categoryData of categories) {
      const { name, description } = categoryData;
      const nameLowerCase = name.toLowerCase();

      try {
        const existingCategory = await this.findByName(nameLowerCase);

        if (existingCategory) {
          throw new HttpError(`A categoria "${name}" já está cadastrada`, 409);
        }

        const category = this.categoryRepository.create({
          name: nameLowerCase,
          description,
        });

        const savedCategory = await this.categoryRepository.save(category);
        success.push(savedCategory);
      } catch (error) {
        if (error instanceof HttpError) {
          errors.push({
            category: categoryData,
            error: error?.message || "Erro desconhecido",
          });
        } else {
          errors.push({
            category: categoryData,
            error: "Erro desconhecido",
          });
        }
      }
    }

    return { success, errors };
  }

  async findAll(): Promise<Category[]> {
    return await this.categoryRepository.find({
      relations: ["services"],
      order: {
        name: "ASC",
      },
    });
  }

  async findById(id: string): Promise<Category | null> {
    return await this.categoryRepository.findOne({
      where: { id },
      relations: ["services"],
    });
  }

  async update(id: string, data: Partial<Category>): Promise<Category | null> {
    const category = await this.categoryRepository.findOneBy({ id });
    if (!category) return null;

    Object.assign(category, data);
    return await this.categoryRepository.save(category);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.categoryRepository.delete(id);
    return !!result.affected;
  }

  async findByName(name: string): Promise<Category | null> {
    return await this.categoryRepository.findOne({ where: { name } });
  }
}
