import { isUUID } from "class-validator";
import { Brackets } from "typeorm";
import { AppDataSource } from "../database";
import { Category } from "../entities/Category";
import { Service } from "../entities/Service";
import { User } from "../entities/User";
import { HttpError } from "../utils/httpError";

const FREE_PLAN_SERVICE_LIMIT = 1;

type CreateService = {
  title: string;
  price: string;
  categoryId: string;
  description?: string;
  userId?: string;
  typeOfChange: string;
};

type SearchParams = {
  stateId: string;
  cityId: string;
  categoryId?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  orderBy?: string;
};

export class ServiceService {
  private serviceRepository = AppDataSource.getRepository(Service);
  private categoryRepository = AppDataSource.getRepository(Category);
  private userRepository = AppDataSource.getRepository(User);

  async create({
    categoryId,
    price,
    title,
    description,
    userId,
    typeOfChange,
  }: CreateService): Promise<Service> {
    const category = await this.categoryRepository.findOneBy({
      id: categoryId,
    });

    if (!category) {
      throw new HttpError("Categoria não encontrada", 404);
    }

    let user: User | null = null;

    if (userId) {
      user = await this.userRepository.findOneBy({ id: userId });
      if (!user) {
        throw new HttpError("Usuário não encontrado", 404);
      }

      if (!user.hasActivePlan) {
        const serviceCount = await this.serviceRepository.count({
          where: { user: { id: userId } },
        });

        if (serviceCount >= FREE_PLAN_SERVICE_LIMIT) {
          throw new HttpError(
            "Limite de serviços atingido. Assine um plano para cadastrar mais.",
            403
          );
        }
      }
    }

    const data: Partial<Service> = {
      title,
      price: Number(price),
      typeOfChange,
      description,
      category,
      user: user ? user : undefined,
    };

    const service = this.serviceRepository.create(data);
    return await this.serviceRepository.save(service);
  }

  async findAll(): Promise<Service[]> {
    return await this.serviceRepository.find({
      relations: ["category", "user", "user.address"],
    });
  }

  async findById(id: string): Promise<Service | null> {
    return await this.serviceRepository.findOne({
      where: { id },
      relations: ["category", "user", "user.address"],
    });
  }

  async findByProvider(userId: string): Promise<Service[]> {
    return await this.serviceRepository.find({
      where: { user: { id: userId } },
      relations: ["category", "user", "user.address"],
    });
  }

  async searchServices({
    stateId,
    cityId,
    categoryId,
    searchTerm,
    page = 1,
    limit = 10,
  }: SearchParams) {
    const query = this.serviceRepository
      .createQueryBuilder("service")
      .leftJoinAndSelect("service.category", "category")
      .leftJoinAndSelect("service.user", "user")
      .leftJoinAndSelect("user.address", "userAddress");

    query.where(
      new Brackets((qb) => {
        qb.where(
          "(userAddress.stateId = :stateId AND userAddress.cityId = :cityId)",
          { stateId, cityId }
        );
      })
    );

    if (categoryId && isUUID(categoryId)) {
      query.andWhere("category.id = :categoryId", { categoryId });
    }

    if (searchTerm) {
      query.andWhere(
        new Brackets((qb) => {
          qb.where("service.title ILIKE :searchTerm", {
            searchTerm: `%${searchTerm}%`,
          }).orWhere("service.description ILIKE :searchTerm", {
            searchTerm: `%${searchTerm}%`,
          });
        })
      );
    }

    const [services, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: services,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async update(
    id: string,
    data: Partial<Service & { categoryId?: string }>
  ): Promise<Service | null> {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: ["category"],
    });

    if (!service) return null;

    if (data.categoryId) {
      const category = await this.categoryRepository.findOneBy({
        id: data.categoryId,
      });
      if (!category) throw new Error("Category not found");
      service.category = category;
    }

    const { categoryId, ...rest } = data;

    Object.assign(service, rest);

    return await this.serviceRepository.save(service);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.serviceRepository.delete(id);
    return !!result.affected;
  }
}
