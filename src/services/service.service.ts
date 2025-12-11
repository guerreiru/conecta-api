import { isUUID } from "class-validator";
import { Brackets, Not } from "typeorm";
import { AppDataSource } from "../database";
import { Category } from "../entities/Category";
import { Service } from "../entities/Service";
import { User } from "../entities/User";
import { Subscription } from "../entities/Subscription";
import { HttpError } from "../utils/httpError";
import { PLAN_CONFIGS, PlanType, SubscriptionStatus } from "../types/PlanType";
import { HighlightLevel } from "../types/HighlightLevel";

type CreateService = {
  title: string;
  price: string;
  categoryId: string;
  description?: string;
  userId?: string;
  serviceType?: "all" | "in_person" | "online";
  typeOfChange: string;
  requestHighlight?: boolean; // Usuário solicita destaque
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
  private subscriptionRepository = AppDataSource.getRepository(Subscription);

  async create({
    categoryId,
    price,
    title,
    description,
    userId,
    typeOfChange,
    serviceType,
    requestHighlight = false,
  }: CreateService): Promise<Service> {
    const category = await this.categoryRepository.findOneBy({
      id: categoryId,
    });

    if (!category) {
      throw new HttpError("Categoria não encontrada", 404);
    }

    let user: User | null = null;
    let canHighlight = false;
    let highlightLevel: HighlightLevel | undefined = undefined;
    undefined;
    undefined;

    if (userId) {
      user = await this.userRepository.findOneBy({ id: userId });
      if (!user) {
        throw new HttpError("Usuário não encontrado", 404);
      }

      // Contar serviços atuais do usuário
      const serviceCount = await this.serviceRepository.count({
        where: { user: { id: userId } },
      });

      // Determinar limites baseado no plano
      let serviceLimit: number;
      let highlightLimit: number;
      let planType: PlanType;

      if (!user.hasActivePlan) {
        // Sem plano ativo = Plano FREE
        planType = PlanType.FREE;
        const planConfig = PLAN_CONFIGS[planType];
        serviceLimit = planConfig.serviceLimit!;
        highlightLimit = planConfig.highlightLimit;
      } else {
        // Com plano ativo = buscar na tabela subscriptions
        const subscription = await this.subscriptionRepository.findOne({
          where: {
            user: { id: userId },
            status: SubscriptionStatus.ACTIVE,
          },
        });

        if (!subscription) {
          // Fallback para FREE se não encontrar assinatura ativa
          planType = PlanType.FREE;
          const planConfig = PLAN_CONFIGS[planType];
          serviceLimit = planConfig.serviceLimit!;
          highlightLimit = planConfig.highlightLimit;
        } else {
          planType = subscription.plan;
          const planConfig = PLAN_CONFIGS[planType];
          serviceLimit = planConfig.serviceLimit ?? Infinity;
          highlightLimit = planConfig.highlightLimit;
          highlightLevel = planConfig.highlightLevel as HighlightLevel;
        }
      }

      // Validar limite de serviços
      if (serviceCount >= serviceLimit) {
        throw new HttpError(
          `Limite de ${serviceLimit} serviço(s) atingido. ${
            !user.hasActivePlan
              ? "Assine um plano para cadastrar mais."
              : "Faça upgrade do seu plano para cadastrar mais serviços."
          }`,
          403
        );
      }

      // Validar solicitação de destaque
      if (requestHighlight) {
        if (highlightLimit === 0) {
          throw new HttpError(
            `Seu plano ${planType.toUpperCase()} não permite destacar serviços. Faça upgrade para usar destaques.`,
            403
          );
        }

        // Contar serviços já destacados
        const highlightedCount = await this.serviceRepository.count({
          where: { user: { id: userId }, isHighlighted: true },
        });

        if (highlightedCount >= highlightLimit) {
          throw new HttpError(
            `Limite de ${highlightLimit} destaque(s) atingido para o plano ${planType.toUpperCase()}. Remova o destaque de outro serviço primeiro.`,
            403
          );
        }

        canHighlight = true;
      }
    }

    const data: Partial<Service> = {
      title,
      price: Number(price),
      typeOfChange,
      description,
      category,
      user: user ? user : undefined,
      isHighlighted: canHighlight,
      highlightLevel: canHighlight ? highlightLevel : undefined,
      serviceType: serviceType || "in_person",
      isActive: true,
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

  async findInactiveByProvider(userId: string): Promise<Service[]> {
    return await this.serviceRepository.find({
      where: { user: { id: userId }, isActive: false },
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
      .leftJoinAndSelect("user.address", "userAddress")
      .where("service.isActive = :isActive", { isActive: true });

    let hasWhere = true;

    if (stateId && cityId) {
      query.andWhere(
        "userAddress.stateId = :stateId AND userAddress.cityId = :cityId",
        { stateId, cityId }
      );
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
        const levelPriority = { enterprise: 3, premium: 2, plus: 1 };
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
    highlightLevel?: HighlightLevel
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

  /**
   * Ativa um serviço específico
   * Respeita o limite do plano atual do usuário
   */
  async activateService(serviceId: string, userId: string): Promise<Service> {
    // Buscar o serviço a ser ativado
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
      relations: ["user", "category"],
    });

    if (!service) {
      throw new HttpError("Serviço não encontrado", 404);
    }

    // Verificar se o serviço pertence ao usuário
    if (service.user.id !== userId) {
      throw new HttpError(
        "Você não tem permissão para ativar este serviço",
        403
      );
    }

    // Verificar se já está ativo
    if (service.isActive) {
      throw new HttpError("Este serviço já está ativo", 400);
    }

    // Buscar assinatura do usuário
    const subscription = await this.subscriptionRepository.findOne({
      where: { user: { id: userId } },
    });

    if (!subscription) {
      throw new HttpError("Assinatura não encontrada", 404);
    }

    // Determinar limite baseado no plano
    const planConfig = PLAN_CONFIGS[subscription.plan];
    const serviceLimit = planConfig.serviceLimit ?? Infinity;

    // Contar serviços ativos atuais
    const activeServicesCount = await this.serviceRepository.count({
      where: { user: { id: userId }, isActive: true },
    });

    // Validar se pode ativar mais serviços
    if (activeServicesCount >= serviceLimit) {
      throw new HttpError(
        `Limite de ${serviceLimit} serviço(s) ativo(s) atingido para o plano ${subscription.plan.toUpperCase()}. Desative outro serviço ou faça upgrade do plano.`,
        403
      );
    }

    // Ativar o serviço
    service.isActive = true;
    return await this.serviceRepository.save(service);
  }

  /**
   * Desativa um serviço específico
   */
  async deactivateService(serviceId: string, userId: string): Promise<Service> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
      relations: ["user", "category"],
    });

    if (!service) {
      throw new HttpError("Serviço não encontrado", 404);
    }

    if (service.user.id !== userId) {
      throw new HttpError(
        "Você não tem permissão para desativar este serviço",
        403
      );
    }

    if (!service.isActive) {
      throw new HttpError("Este serviço já está inativo", 400);
    }

    service.isActive = false;
    return await this.serviceRepository.save(service);
  }

  /**
   * Usuário ativa/desativa destaque em serviço próprio
   * Valida limite do plano atual
   */
  async toggleHighlight(
    serviceId: string,
    userId: string,
    enable: boolean
  ): Promise<Service> {
    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
      relations: ["user", "category"],
    });

    if (!service) {
      throw new HttpError("Serviço não encontrado", 404);
    }

    if (service.user.id !== userId) {
      throw new HttpError(
        "Você não tem permissão para modificar este serviço",
        403
      );
    }

    // Se está desabilitando, apenas remove
    if (!enable) {
      service.isHighlighted = false;
      service.highlightLevel = undefined;
      return await this.serviceRepository.save(service);
    }

    // Se está habilitando, validar limites
    const subscription = await this.subscriptionRepository.findOne({
      where: { user: { id: userId }, status: SubscriptionStatus.ACTIVE },
    });

    if (!subscription) {
      throw new HttpError(
        "Assinatura não encontrada. Assine um plano para destacar serviços.",
        403
      );
    }

    const planConfig = PLAN_CONFIGS[subscription.plan];
    const highlightLimit = planConfig.highlightLimit;

    if (highlightLimit === 0) {
      throw new HttpError(
        `Seu plano ${subscription.plan.toUpperCase()} não permite destacar serviços. Faça upgrade.`,
        403
      );
    }

    // Contar destaques ativos (excluindo o próprio serviço)
    const highlightedCount = await this.serviceRepository.count({
      where: {
        user: { id: userId },
        isHighlighted: true,
        id: Not(serviceId) as any,
      },
    });

    if (highlightedCount >= highlightLimit) {
      throw new HttpError(
        `Limite de ${highlightLimit} destaque(s) atingido. Remova destaque de outro serviço primeiro.`,
        403
      );
    }

    service.isHighlighted = true;
    service.highlightLevel = planConfig.highlightLevel as HighlightLevel;
    return await this.serviceRepository.save(service);
  }

  /**
   * Retorna estatísticas de destaques do usuário
   */
  async getHighlightStats(userId: string) {
    const subscription = await this.subscriptionRepository.findOne({
      where: { user: { id: userId } },
    });

    const planType = subscription?.plan || PlanType.FREE;
    const planConfig = PLAN_CONFIGS[planType];

    const highlightedCount = await this.serviceRepository.count({
      where: { user: { id: userId }, isHighlighted: true },
    });

    return {
      plan: planType,
      highlightLimit: planConfig.highlightLimit,
      highlightedCount,
      available: planConfig.highlightLimit - highlightedCount,
      canHighlight: highlightedCount < planConfig.highlightLimit,
    };
  }
}
