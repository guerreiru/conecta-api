import { EntityManager } from "typeorm";
import { AppDataSource } from "../database";
import { Provider } from "../entities/Provider";
import { Profile } from "../entities/Profile";
import { User } from "../entities/User";
import { HttpError } from "../utils/httpError";
import { City } from "../entities/City";
import { State } from "../entities/State";
import { Address } from "../entities/Address";

interface CreateProviderDTO {
  providerName: string;
  specialty?: string;
  bio?: string;
  address: Address & { stateId: string; cityId: string };
  userId: string;
}

export class ProviderService {
  private providerRepository = AppDataSource.getRepository(Provider);

  async create(providerData: CreateProviderDTO): Promise<Provider> {
    try {
      return AppDataSource.transaction(async (manager: EntityManager) => {
        // 1. Validar usuário
        const user = await this.validateUser(manager, providerData.userId);

        // 2. Validar estado e cidade
        const { state, city } = await this.validateStateAndCity(
          manager,
          providerData.address.stateId,
          providerData.address.cityId
        );

        // 3. Criar e salvar perfil
        const profile = await this.createProfile(manager, user);

        // 4. Criar e salvar endereço
        const address = await this.createAddress(
          manager,
          providerData.address,
          state,
          city
        );

        // 5. Criar e salvar provider
        const provider = await this.createProvider(
          manager,
          providerData,
          address,
          profile
        );

        // 6. Atualizar perfil com o provider criado
        await this.updateProfileWithProvider(manager, profile.id, provider);

        return provider;
      });
    } catch (error) {
      if (error instanceof HttpError) {
        throw new HttpError(error.message, error.statusCode);
      } else {
        throw new HttpError("Erro desconhecido", 500);
      }
    }
  }

  async findAll(): Promise<Provider[]> {
    return this.providerRepository.find({
      relations: ["profile", "profile.user", "services", "address"],
      select: {
        id: true,
        providerName: true,
        specialty: true,
        bio: true,
        address: {
          id: true,
          zipCode: true,
          street: true,
          number: true,
          neighborhood: true,
          stateName: true,
          stateId: true,
          cityName: true,
          cityId: true,
          website: true,
          phone: true,
        },
        profile: {
          id: true,
          type: true,
          user: {
            id: true,
            name: true,
            email: true,
          },
        },
        services: {
          id: true,
          title: true,
          description: true,
          price: true,
          typeOfChange: true,
        },
      },
    });
  }

  async findById(id: string): Promise<Provider | null> {
    return this.providerRepository.findOne({
      where: { id },
      relations: ["profile", "profile.user", "services", "address"],
      select: {
        id: true,
        providerName: true,
        specialty: true,
        bio: true,
        address: {
          id: true,
          zipCode: true,
          street: true,
          number: true,
          neighborhood: true,
          stateName: true,
          stateId: true,
          cityName: true,
          cityId: true,
          website: true,
          phone: true,
        },
        profile: {
          id: true,
          type: true,
          user: {
            id: true,
            name: true,
            email: true,
          },
        },
        services: {
          id: true,
          title: true,
          description: true,
          price: true,
          typeOfChange: true,
        },
      },
    });
  }

  async update(id: string, data: Partial<Provider>): Promise<Provider | null> {
    const provider = await this.providerRepository.findOneBy({ id });
    if (!provider) return null;

    Object.assign(provider, data);
    return this.providerRepository.save(provider);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.providerRepository.delete(id);
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
      type: "provider",
    });

    await manager.save(profile);

    return profile;
  }

  private async createAddress(
    manager: EntityManager,
    addressData: CreateProviderDTO["address"],
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

  private async createProvider(
    manager: EntityManager,
    providerData: CreateProviderDTO,
    address: Address,
    profile: Profile
  ): Promise<Provider> {
    const provider = manager.create(Provider, {
      ...providerData,
      address,
      profile,
      providerName: providerData.providerName || profile.user.name,
    });

    return await manager.save(provider);
  }

  private async updateProfileWithProvider(
    manager: EntityManager,
    profileId: string,
    provider: Provider
  ): Promise<void> {
    await manager.update(Profile, profileId, { provider });
  }
}
