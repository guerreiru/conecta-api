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
  serviceType?: "all" | "in_person" | "online";
  typeOfChange: string;
};

type SearchParams = {
  stateId?: string;
  cityId?: string;
  categoryId?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  priceMin?: number;
  priceMax?: number;
  minRating?: number;
  sortBy?: "relevance" | "price_asc" | "price_desc" | "rating_desc" | "newest";
  serviceType?: "all" | "in_person" | "online";
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
    serviceType,
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
      isHighlighted: false,
      highlightLevel: undefined,
      serviceType: serviceType || "in_person",
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
    priceMin,
    priceMax,
    minRating,
    sortBy = "relevance",
    serviceType,
  }: SearchParams) {
    this.validateSearchParams({ priceMin, priceMax, minRating });

    const query = this.buildSearchQuery({
      stateId,
      cityId,
      categoryId,
      searchTerm,
      priceMin,
      priceMax,
      minRating,
      serviceType,
    });

    const [allServices, total] = await query.getManyAndCount();

    const sortedServices = this.sortServices(allServices, sortBy);

    const paginatedServices = this.paginateResults(sortedServices, page, limit);

    return {
      data: paginatedServices,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  private validateSearchParams({
    priceMin,
    priceMax,
    minRating,
  }: Pick<SearchParams, "priceMin" | "priceMax" | "minRating">) {
    if (minRating !== undefined && (minRating < 0 || minRating > 5)) {
      throw new HttpError("minRating deve estar entre 0 e 5", 400);
    }

    if (priceMin !== undefined && priceMin < 0) {
      throw new HttpError("priceMin não pode ser negativo", 400);
    }

    if (priceMax !== undefined && priceMax < 0) {
      throw new HttpError("priceMax não pode ser negativo", 400);
    }

    if (
      priceMin !== undefined &&
      priceMax !== undefined &&
      priceMin > priceMax
    ) {
      throw new HttpError("priceMin não pode ser maior que priceMax", 400);
    }
  }

  private buildSearchQuery({
    stateId,
    cityId,
    categoryId,
    searchTerm,
    priceMin,
    priceMax,
    minRating,
    serviceType,
  }: Omit<SearchParams, "page" | "limit" | "sortBy">) {
    const query = this.serviceRepository
      .createQueryBuilder("service")
      .leftJoinAndSelect("service.category", "category")
      .leftJoinAndSelect("service.user", "user")
      .leftJoinAndSelect("user.address", "userAddress");

    let hasWhere = false;

    if (stateId && cityId) {
      query.where(
        "userAddress.stateId = :stateId AND userAddress.cityId = :cityId",
        { stateId, cityId }
      );
      hasWhere = true;
    }

    if (categoryId && isUUID(categoryId)) {
      this.addCondition(query, hasWhere, "category.id = :categoryId", {
        categoryId,
      });
      hasWhere = true;
    }

    if (searchTerm) {
      const condition = new Brackets((qb) => {
        qb.where("service.title ILIKE :searchTerm", {
          searchTerm: `%${searchTerm}%`,
        }).orWhere("service.description ILIKE :searchTerm", {
          searchTerm: `%${searchTerm}%`,
        });
      });

      if (hasWhere) {
        query.andWhere(condition);
      } else {
        query.where(condition);
        hasWhere = true;
      }
    }

    if (priceMin !== undefined) {
      this.addCondition(query, hasWhere, "service.price >= :priceMin", {
        priceMin,
      });
      hasWhere = true;
    }

    if (priceMax !== undefined) {
      this.addCondition(query, hasWhere, "service.price <= :priceMax", {
        priceMax,
      });
      hasWhere = true;
    }

    if (minRating !== undefined && minRating > 0) {
      this.addCondition(
        query,
        hasWhere,
        "service.averageRating >= :minRating",
        { minRating }
      );
      hasWhere = true;
    }

    if (serviceType && serviceType !== "all") {
      this.addCondition(query, hasWhere, "service.serviceType = :serviceType", {
        serviceType,
      });
      hasWhere = true;
    }

    return query;
  }

  private addCondition(
    query: any,
    hasWhere: boolean,
    condition: string,
    parameters: any
  ) {
    if (hasWhere) {
      query.andWhere(condition, parameters);
    } else {
      query.where(condition, parameters);
    }
  }

  private sortServices(
    services: Service[],
    sortBy: SearchParams["sortBy"]
  ): Service[] {
    return services.sort((a, b) => {
      if (a.isHighlighted !== b.isHighlighted) {
        return a.isHighlighted ? -1 : 1;
      }

      if (
        a.isHighlighted &&
        b.isHighlighted &&
        a.highlightLevel &&
        b.highlightLevel
      ) {
        const levelPriority = { enterprise: 3, premium: 2, pro: 1 };
        const aPriority = levelPriority[a.highlightLevel] || 0;
        const bPriority = levelPriority[b.highlightLevel] || 0;

        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
      }

      return this.applySortStrategy(a, b, sortBy || "relevance");
    });
  }

  private applySortStrategy(
    a: Service,
    b: Service,
    sortBy: NonNullable<SearchParams["sortBy"]>
  ): number {
    switch (sortBy) {
      case "price_asc":
        return Number(a.price) - Number(b.price);

      case "price_desc":
        return Number(b.price) - Number(a.price);

      case "rating_desc":
        return b.averageRating - a.averageRating;

      case "newest":
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );

      case "relevance":
      default:
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  }

  private paginateResults(
    services: Service[],
    page: number,
    limit: number
  ): Service[] {
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    return services.slice(startIndex, endIndex);
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

    const { categoryId, isHighlighted, highlightLevel, ...rest } = data;

    if (isHighlighted !== undefined || highlightLevel !== undefined) {
      throw new HttpError(
        "Campos de destaque só podem ser alterados por administradores",
        403
      );
    }

    Object.assign(service, rest);

    return await this.serviceRepository.save(service);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.serviceRepository.delete(id);
    return !!result.affected;
  }

  /**
   * Método administrativo para gerenciar destaque de serviços
   * Deve ser chamado apenas por rotas protegidas com role "nanal"
   */
  async updateHighlight(
    id: string,
    isHighlighted: boolean,
    highlightLevel?: "pro" | "premium" | "enterprise"
  ): Promise<Service | null> {
    const service = await this.serviceRepository.findOne({
      where: { id },
      relations: ["category", "user", "user.address"],
    });

    if (!service) {
      throw new HttpError("Serviço não encontrado", 404);
    }

    if (isHighlighted && !highlightLevel) {
      throw new HttpError(
        "highlightLevel é obrigatório quando isHighlighted é true",
        400
      );
    }

    if (!isHighlighted) {
      service.isHighlighted = false;
      service.highlightLevel = undefined;
    } else {
      service.isHighlighted = true;
      service.highlightLevel = highlightLevel as any;
    }

    return await this.serviceRepository.save(service);
  }
}
