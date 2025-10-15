import * as bcrypt from "bcrypt";
import { AppDataSource } from "../database";
import { User } from "../entities/User";
import { UserRole } from "../types/UserRole";
import { HttpError } from "../utils/httpError";
import { ProfileService } from "./profile.service";

interface CreateUserData {
  name: string;
  email: string;
  password: string;
}

const profileService = new ProfileService();

export class UserService {
  private userRepository = AppDataSource.getRepository(User);

  async create({ email, name, password }: CreateUserData): Promise<User> {
    const existingUser = await this.findByEmail(email);
    if (existingUser) {
      throw new HttpError("Este email já está cadastrado", 409);
    }

    const validProfileTypes: UserRole[] = ["client", "company", "provider"];

    if (!validProfileTypes.includes("client")) {
      throw new HttpError("Tipo de perfil inválido.", 400);
    }

    try {
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(password, saltRounds);

      const user = this.userRepository.create({
        name: name,
        email: email,
        password: hashedPassword,
      });

      const savedUser = await this.userRepository.save(user);

      await profileService.create({ type: "client", user: savedUser });

      const userWithProfile = await this.findById(savedUser.id);

      if (!userWithProfile) {
        throw new HttpError("Erro ao recuperar usuário criado", 500);
      }

      return userWithProfile;
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
    return await this.userRepository.find({ relations: ["profiles"] });
  }

  async findById(id: string): Promise<User | null> {
    return await this.userRepository.findOne({
      where: { id },
      relations: ["profiles"],
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

  async update(id: string, data: Partial<User>): Promise<User | null> {
    const user = await this.userRepository.findOneBy({ id });

    if (!user) return null;

    Object.assign(user, data);
    return await this.userRepository.save(user);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.userRepository.delete(id);
    return !!result.affected;
  }
}
