import { isUUID } from "class-validator";
import { Brackets, FindOperator } from "typeorm";
import { AppDataSource } from "../database";
import { Category } from "../entities/Category";
import { City } from "../entities/City";
import { Company } from "../entities/Company";
import { Provider } from "../entities/Provider";
import { Service } from "../entities/Service";
import { State } from "../entities/State";
import { HttpError } from "../utils/httpError";

type CreateService = {
  title: string;
  price: string;
  categoryId: string;
  description?: string;
  companyId?: string;
  providerId?: string;
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

type WhereOptions = {
  company: {
    address: {
      stateId: string;
      cityId: string;
    };
  };
  provider: {
    address: {
      stateId: string;
      cityId: string;
    };
  };
  category?: {
    id: string;
  };
  title?: FindOperator<string>;
  description?: FindOperator<string>;
};

export class ServiceService {
  private serviceRepository = AppDataSource.getRepository(Service);
  private categoryRepository = AppDataSource.getRepository(Category);
  private companyRepository = AppDataSource.getRepository(Company);
  private providerRepository = AppDataSource.getRepository(Provider);
  private stateRepository = AppDataSource.getRepository(State);
  private cityRepository = AppDataSource.getRepository(City);

  async create({
    categoryId,
    price,
    title,
    companyId,
    description,
    providerId,
    typeOfChange,
  }: CreateService): Promise<Service> {
    const category = await this.categoryRepository.findOneBy({
      id: categoryId,
    });

    if (!category) {
      throw new HttpError("Categoria não encontrada", 404);
    }

    let provider: Provider | null = null;
    let company: Company | null = null;

    if (providerId) {
      provider = await this.providerRepository.findOneBy({ id: providerId });
      if (!provider) {
        throw new HttpError("Prestador de serviço não encontrado");
      }
    }

    if (companyId) {
      company = await this.companyRepository.findOneBy({ id: companyId });
      if (!companyId) {
        throw new HttpError("Empresa não encontrada");
      }
    }

    const data: Partial<Service> = {
      title,
      price: Number(price),
      typeOfChange,
      description,
      category,
      company: company ? company : undefined,
      provider: provider ? provider : undefined,
    };

    const service = this.serviceRepository.create(data);
    return await this.serviceRepository.save(service);
  }

  async findAll(): Promise<Service[]> {
    return await this.serviceRepository.find({
      relations: [
        "category",
        "company",
        "company.address",
        "provider",
        "provider.address",
        "provider.profile",
        "provider.profile.user",
      ],
    });
  }

  async findById(id: string): Promise<Service | null> {
    return await this.serviceRepository.findOne({
      where: { id },
      relations: [
        "category",
        "company",
        "company.address",
        "provider",
        "provider.address",
        "provider.profile",
        "provider.profile.user",
      ],
    });
  }

  async findByProvider(providerId: string): Promise<Service[]> {
    return await this.serviceRepository.find({
      where: { provider: { id: providerId } },
      relations: [
        "category",
        "company",
        "company.address",
        "provider",
        "provider.address",
        "provider.profile",
        "provider.profile.user",
      ],
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
      .leftJoinAndSelect("service.company", "company")
      .leftJoinAndSelect("company.address", "companyAddress")
      .leftJoinAndSelect("service.provider", "provider")
      .leftJoinAndSelect("provider.address", "providerAddress")
      .leftJoinAndSelect("provider.profile", "profile")
      .leftJoinAndSelect("profile.user", "user");

    // Filtro por endereço (OR entre company e provider)
    query.where(
      new Brackets((qb) => {
        qb.where(
          "(companyAddress.stateId = :stateId AND companyAddress.cityId = :cityId)",
          { stateId, cityId }
        ).orWhere(
          "(providerAddress.stateId = :stateId AND providerAddress.cityId = :cityId)",
          { stateId, cityId }
        );
      })
    );

    // Filtro por categoria (opcional)
    if (categoryId && isUUID(categoryId)) {
      query.andWhere("category.id = :categoryId", { categoryId });
    }

    // Filtro por termo de busca (opcional)
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

    // Paginação
    const [services, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    // Retorno paginado
    return {
      data: services,
      total,
      page,
      lastPage: Math.ceil(total / limit),
    };
  }

  async update(id: string, data: Partial<Service>): Promise<Service | null> {
    const service = await this.serviceRepository.findOneBy({ id });
    if (!service) return null;

    Object.assign(service, data);
    return await this.serviceRepository.save(service);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.serviceRepository.delete(id);
    return !!result.affected;
  }
}
