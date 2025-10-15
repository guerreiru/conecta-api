import { compare, hash } from "bcrypt";
import { AppDataSource } from "../database";
import { User } from "../entities/User";
import { HttpError } from "../utils/httpError";
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

    const accessToken = generateAccessToken({
      id: user.id,
      name: user.name,
      roles,
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      name: user.name,
      roles,
    });

    user.refreshToken = await hash(refreshToken, 10);
    user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

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
      where: { id: decoded.id },
      select: [
        "id",
        "email",
        "password",
        "name",
        "refreshToken",
        "refreshTokenExpires",
      ],
      relations: {
        profiles: {
          user: true,
          company: true,
          provider: true,
        },
      },
    });

    if (!user || !user.refreshToken) throw new HttpError("Token inválido");

    if (user.refreshTokenExpires && new Date() > user.refreshTokenExpires) {
      throw new HttpError("Refresh token expirado");
    }

    const valid = await compare(token, user.refreshToken);
    if (!valid) throw new HttpError("Token inválido");

    const { profiles } = user;

    if (!profiles.length) throw new HttpError("Usuário não possui perfil");

    const roles = user.profiles.map((profile) => profile.type);

    const newAccessToken = generateAccessToken({
      id: user.id,
      name: user.name,
      roles,
    });
    const newRefreshToken = generateRefreshToken({
      id: user.id,
      name: user.name,
      roles,
    });

    user.refreshToken = await hash(newRefreshToken, 10);
    user.refreshTokenExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.userRepo.save(user);

    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        roles: roles,
        profiles,
      },
    };
  }

  async logout(refreshToken: string) {
    const user = await this.userRepo.findOne({
      where: { refreshToken: await hash(refreshToken, 10) },
    });

    if (user) {
      user.refreshToken = null;
      user.refreshTokenExpires = null;
      await this.userRepo.save(user);
    }
  }

  async findUserByEmailWithPassword(email: string) {
    return this.userRepo.findOne({
      where: { email },
      select: [
        "id",
        "email",
        "password",
        "name",
        "refreshToken",
        "refreshTokenExpires",
      ],
      relations: {
        profiles: {
          user: true,
          company: true,
          provider: true,
        },
      },
    });
  }

  async getUserById(userId: string) {
    return this.userRepo.findOne({
      where: { id: userId },
      select: ["id", "email", "password", "name"],
      relations: {
        profiles: {
          user: true,
          company: true,
          provider: true,
        },
      },
    });
  }
}
