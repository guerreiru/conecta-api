import * as bcrypt from "bcrypt";
import { AppDataSource } from "../database";
import { Address } from "../entities/Address";
import { City } from "../entities/City";
import { Service } from "../entities/Service";
import { State } from "../entities/State";
import { User } from "../entities/User";
import { UserRole } from "../types/UserRole";
import { HttpError } from "../utils/httpError";

type CreateUserDTO = {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  specialty?: string;
  bio?: string;
  address?: Address & { stateId: string; cityId: string };
  requestingUserId?: string;
} & Partial<User>;

export class UserService {
  private userRepository = AppDataSource.getRepository(User);
  private stateRepository = AppDataSource.getRepository(State);
  private addressRepository = AppDataSource.getRepository(Address);

  async create({
    email,
    name,
    password,
    role = "client",
    bio,
    specialty,
    ...userData
  }: CreateUserDTO): Promise<User> {
    try {
      const existingUser = await this.findByEmail(email);
      if (existingUser) {
        throw new HttpError("Este email já está cadastrado", 409);
      }

      const privilegedRoles: UserRole[] = ["nanal"];
      if (privilegedRoles.includes(role)) {
        if (!userData.requestingUserId) {
          throw new HttpError(
            "Apenas usuários autenticados com permissões de administrador podem criar usuários com role privilegiada",
            403
          );
        }

        const requestingUser = await this.userRepository.findOne({
          where: { id: userData.requestingUserId },
          select: ["id", "role"],
        });

        if (!requestingUser || !privilegedRoles.includes(requestingUser.role)) {
          throw new HttpError(
            "Você não tem permissão para criar usuários com role privilegiada",
            403
          );
        }
      }

      const validProfileTypes: UserRole[] = ["client", "provider"];

      if (!validProfileTypes.includes("client")) {
        throw new HttpError("Tipo de perfil inválido.", 400);
      }

      let address = null;

      if (userData.address) {
        const { state, city } = await this.validateStateAndCity(
          userData.address.stateId,
          userData.address.cityId
        );

        address = await this.createAddress(userData.address, state, city);
      }

      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const user = this.userRepository.create({
        name: name,
        email: email,
        password: hashedPassword,
        address: address ? address : undefined,
        bio,
        specialty,
        role,
      });

      return await this.userRepository.save(user);
    } catch (error) {
      if (error instanceof HttpError) {
        throw error;
      }
      if (error instanceof Error) {
        throw new HttpError(`Erro ao criar usuário: ${error.message}`, 500);
      }
      throw new HttpError("Erro desconhecido ao criar usuário", 500);
    }
  }

  async findAll(): Promise<User[]> {
    return await this.userRepository.find();
  }

  async findById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
      relations: {
        address: true,
        services: {
          category: true,
        },
      },
    });
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { email } });
  }

  async findUserWithPassword(email: string) {
    const userRepository = AppDataSource.getRepository(User);
    return await userRepository.findOne({
      where: { email },
      relations: ["profiles", "profiles.provider", "profiles.company"],
    });
  }

  async update(
    id: string,
    data: Partial<User>,
    requestingUserId?: string
  ): Promise<User | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["address", "services", "services.category"],
    });

    if (!user) {
      throw new HttpError("Usuário não encontrado", 404);
    }

    if (data.email) {
      throw new HttpError(
        "Use o endpoint /auth/change-email para alterar o email",
        400
      );
    }

    if (data.password) {
      throw new HttpError(
        "Use o endpoint /auth/change-password para alterar a senha",
        400
      );
    }

    if (data.role) {
      const privilegedRoles: UserRole[] = ["nanal"];
      const isChangingToPrivileged = privilegedRoles.includes(data.role);
      const isCurrentlyPrivileged = privilegedRoles.includes(user.role);

      if (isChangingToPrivileged || isCurrentlyPrivileged) {
        if (!requestingUserId) {
          throw new HttpError(
            "Apenas usuários autenticados com permissões de administrador podem alterar roles privilegiadas",
            403
          );
        }

        const requestingUser = await this.userRepository.findOne({
          where: { id: requestingUserId },
          select: ["id", "role"],
        });

        if (!requestingUser || !privilegedRoles.includes(requestingUser.role)) {
          throw new HttpError(
            "Você não tem permissão para alterar roles privilegiadas",
            403
          );
        }
      }
    }

    if (data.address) {
      if (user.address) {
        Object.assign(user.address, data.address);
        await this.addressRepository.save(user.address);
      } else {
        const newAddress = this.addressRepository.create(data.address);
        user.address = await this.addressRepository.save(newAddress);
      }

      delete data.address;
    }

    delete data.refreshToken;
    delete data.refreshTokenExpires;

    Object.assign(user, data);

    return await this.userRepository.save(user);
  }

  async delete(id: string): Promise<boolean> {
    // Verificar se o usuário existe
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ["address", "services", "services.category"],
    });

    if (!user) {
      throw new HttpError("Usuário não encontrado", 404);
    }

    // Deletar serviços do usuário
    if (user.services && user.services.length > 0) {
      const serviceRepository = AppDataSource.getRepository(Service);
      await serviceRepository.delete(user.services.map((s) => s.id));
    }

    // Deletar endereço do usuário
    if (user.address) {
      await this.addressRepository.delete(user.address.id);
    }

    // Deletar o usuário
    const result = await this.userRepository.delete(id);
    return !!result.affected;
  }

  private async validateStateAndCity(
    stateId: string,
    cityId: string
  ): Promise<{ state: State; city: City }> {
    const state = await this.stateRepository.findOne({
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

  private async createAddress(
    addressData: CreateUserDTO["address"],
    state: State,
    city: City
  ): Promise<Address> {
    const address = this.addressRepository.create({
      ...addressData,
      stateId: state.id,
      cityId: city.id,
    });

    await this.addressRepository.save(address);

    return address;
  }
}
