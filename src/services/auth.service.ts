import { compare } from "bcrypt";
import { AppDataSource } from "../database";
import { User } from "../entities/User";
import { HttpError } from "../utils/errors/HttpError";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/token";

export class AuthService {
  private userRepo = AppDataSource.getRepository(User);

  async login(email: string, password: string) {
    const user = await this.findUserByEmailWithPassword(email);

    if (!user) throw new HttpError("Email ou senha incorretos");

    const valid = await compare(password, user.password);
    if (!valid) throw new HttpError("Email ou senha incorretos");

    const { profiles } = user;

    if (!profiles.length) throw new HttpError("Usuário não possui perfil");

    const roles = profiles.map((profile) => profile.type);

    const accessToken = generateAccessToken(user.id, roles);
    const refreshToken = generateRefreshToken(user.id, roles);

    user.refreshToken = refreshToken;

    await this.userRepo.save(user);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: roles,
        profiles,
      },
    };
  }

  async refresh(token: string) {
    const decoded: any = verifyRefreshToken(token);

    const user = await this.userRepo.findOne({
      where: { id: decoded.userId },
      relations: ["profiles"],
    });

    if (!user || user.refreshToken !== token)
      throw new HttpError("Token inválido");

    const { profiles } = user;

    const roles = profiles.map((profile) => profile.type);

    const newAccessToken = generateAccessToken(user.id, roles);
    const newRefreshToken = generateRefreshToken(user.id, roles);

    user.refreshToken = newRefreshToken;
    await this.userRepo.save(user);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  }

  async logout(refreshToken: string) {
    const user = await this.userRepo.findOneBy({ refreshToken });

    if (user) {
      user.refreshToken = null;
      await this.userRepo.save(user);
    }
  }

  async findUserByEmailWithPassword(email: string) {
    return this.userRepo.findOne({
      where: { email },
      select: ["id", "email", "password"],
      relations: ["profiles", "profiles.provider", "profiles.company"],
    });
  }
}
