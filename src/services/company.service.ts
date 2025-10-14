import { EntityManager } from "typeorm";
import { AppDataSource } from "../database";
import { Company } from "../entities/Company";
import { Profile } from "../entities/Profile";
import { User } from "../entities/User";
import { HttpError } from "../utils/errors/HttpError";
import { City } from "../entities/City";
import { State } from "../entities/State";
import { Address } from "../entities/Address";

interface CreateCompanyDTO {
  companyName: string;
  specialty?: string;
  bio?: string;
  address: Address;
  userId: string;
}

export class CompanyService {
  private companyRepository = AppDataSource.getRepository(Company);

  async create(companyData: CreateCompanyDTO): Promise<Company> {
    try {
      return AppDataSource.transaction(async (manager: EntityManager) => {
        // 1. Validar usuário
        const user = await this.validateUser(manager, companyData.userId);

        // 2. Validar estado e cidade
        const { state, city } = await this.validateStateAndCity(
          manager,
          companyData.address.stateId,
          companyData.address.cityId
        );

        // 3. Criar e salvar perfil
        const profile = await this.createProfile(manager, user);

        // 4. Criar e salvar endereço
        const address = await this.createAddress(
          manager,
          companyData.address,
          state,
          city
        );

        // 5. Criar e salvar empresa
        const company = await this.createCompany(
          manager,
          companyData,
          address,
          profile
        );

        // 6. Atualizar perfil com a empresa criada
        await this.updateProfileWithCompany(manager, profile.id, company);

        return company;
      });
    } catch (error) {
      if (error instanceof HttpError) {
        throw new HttpError(error.message, error.statusCode);
      } else {
        throw new HttpError("Erro desconhecido", 500);
      }
    }
  }

  async findAll(): Promise<Company[]> {
    return this.companyRepository.find({
      relations: ["profile", "services", "address"],
    });
  }

  async findById(id: string): Promise<Company | null> {
    return this.companyRepository.findOne({
      where: { id },
      relations: ["profile", "services", "address"],
    });
  }

  async update(id: string, data: Partial<Company>): Promise<Company | null> {
    const company = await this.companyRepository.findOneBy({ id });
    if (!company) return null;

    Object.assign(company, data);
    return this.companyRepository.save(company);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.companyRepository.delete(id);
    return !!result.affected;
  }

  private async validateUser(
    manager: EntityManager,
    userId: string
  ): Promise<User> {
    const user = await manager.findOne(User, { where: { id: userId } });

    if (!user) {
      throw new HttpError("Usuário não encontrado", 404);
    }

    return user;
  }

  private async validateStateAndCity(
    manager: EntityManager,
    stateId: string,
    cityId: string
  ): Promise<{ state: State; city: City }> {
    const state = await manager.findOne(State, {
      where: { id: stateId },
      relations: ["cities"],
    });

    if (!state) {
      throw new HttpError("Estado não encontrado", 404);
    }

    const city = state.cities.find((city) => city.id === cityId);

    if (!city) {
      throw new HttpError("Cidade não encontrada", 404);
    }

    return { state, city };
  }

  private async createProfile(
    manager: EntityManager,
    user: User
  ): Promise<Profile> {
    const profile = manager.create(Profile, {
      user,
      type: "company",
    });

    await manager.save(profile);

    return profile;
  }

  private async createAddress(
    manager: EntityManager,
    addressData: CreateCompanyDTO["address"],
    state: State,
    city: City
  ): Promise<Address> {
    const address = manager.create(Address, {
      ...addressData,
      stateId: state.id,
      cityId: city.id,
    });

    await manager.save(address);

    return address;
  }

  private async createCompany(
    manager: EntityManager,
    companyData: CreateCompanyDTO,
    address: Address,
    profile: Profile
  ): Promise<Company> {
    const company = manager.create(Company, {
      ...companyData,
      address,
      profile,
    });

    return await manager.save(company);
  }

  private async updateProfileWithCompany(
    manager: EntityManager,
    profileId: string,
    company: Company
  ): Promise<void> {
    await manager.update(Profile, profileId, { company });
  }
}
