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
      isHighlighted: false,
      highlightLevel: undefined,
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

    // Buscar todos os resultados para ordenar no código
    const [allServices, total] = await query.getManyAndCount();

    // Ordenação manual: destacados primeiro, depois por nível (enterprise > premium > pro), e por data
    const sortedServices = allServices.sort((a, b) => {
      // 1. Destacados primeiro
      if (a.isHighlighted !== b.isHighlighted) {
        return a.isHighlighted ? -1 : 1;
      }

      // 2. Se ambos destacados, ordenar por nível
      if (a.isHighlighted && b.isHighlighted) {
        const levelPriority = { enterprise: 3, premium: 2, pro: 1 };
        const aPriority = a.highlightLevel
          ? levelPriority[a.highlightLevel]
          : 0;
        const bPriority = b.highlightLevel
          ? levelPriority[b.highlightLevel]
          : 0;

        if (aPriority !== bPriority) {
          return bPriority - aPriority; // DESC
        }
      }

      // 3. Por data de criação
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    // Aplicar paginação
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const services = sortedServices.slice(startIndex, endIndex);

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

    // Sanitizar campos protegidos contra manipulação
    const { categoryId, isHighlighted, highlightLevel, ...rest } = data;

    // Se tentar alterar campos protegidos, bloquear
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

    // Validação: se destacado, highlightLevel é obrigatório
    if (isHighlighted && !highlightLevel) {
      throw new HttpError(
        "highlightLevel é obrigatório quando isHighlighted é true",
        400
      );
    }

    // Se não está destacado, limpar highlightLevel
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
