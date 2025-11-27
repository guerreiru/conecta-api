import { compare, hash } from "bcrypt";
import { AppDataSource } from "../database";
import { User } from "../entities/User";
import { HttpError } from "../utils/httpError";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  TokenPayload,
} from "../utils/token";
import { AUTH_CONFIG } from "../config/auth.config";

interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: Omit<User, "password" | "refreshToken" | "refreshTokenExpires">;
}

interface MeResponse {
  accessToken: string;
  user: Omit<User, "password" | "refreshToken" | "refreshTokenExpires">;
}
export class AuthService {
  private userRepo = AppDataSource.getRepository(User);

  async login(email: string, password: string): Promise<AuthResponse> {
    const user = await this.findUserByEmailWithPassword(email);

    if (!user) {
      throw new HttpError(AUTH_CONFIG.ERRORS.INVALID_CREDENTIALS, 401);
    }

    const isPasswordValid = await compare(password, user.password);
    if (!isPasswordValid) {
      throw new HttpError(AUTH_CONFIG.ERRORS.INVALID_CREDENTIALS, 401);
    }

    const { accessToken, refreshToken } = this.generateTokenPair(user);

    await this.storeRefreshToken(user, refreshToken);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async refresh(token: string): Promise<AuthResponse> {
    const decoded: TokenPayload = verifyRefreshToken(token);

    const user = await this.findUserById(decoded.id);

    if (!user || !user.refreshToken) {
      throw new HttpError(AUTH_CONFIG.ERRORS.TOKEN_INVALID, 401);
    }

    if (user.refreshTokenExpires && new Date() > user.refreshTokenExpires) {
      await this.clearRefreshToken(user);
      throw new HttpError(AUTH_CONFIG.ERRORS.REFRESH_TOKEN_EXPIRED, 401);
    }

    const isTokenValid = await compare(token, user.refreshToken);
    if (!isTokenValid) {
      await this.clearRefreshToken(user);
      throw new HttpError(AUTH_CONFIG.ERRORS.TOKEN_INVALID, 401);
    }

    const { accessToken, refreshToken: newRefreshToken } =
      this.generateTokenPair(user);

    await this.storeRefreshToken(user, newRefreshToken);

    return {
      accessToken,
      refreshToken: newRefreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      const decoded: TokenPayload = verifyRefreshToken(refreshToken);

      const user = await this.userRepo.findOne({
        where: { id: decoded.id },
        select: ["id", "refreshToken"],
      });

      if (user && user.refreshToken) {
        const isTokenValid = await compare(refreshToken, user.refreshToken);

        if (isTokenValid) {
          await this.clearRefreshToken(user);
        }
      }
    } catch (error) {}
  }

  async getMe(refreshToken: string): Promise<MeResponse> {
    const decoded: TokenPayload = verifyRefreshToken(refreshToken);

    const user = await this.findUserById(decoded.id);

    if (!user || !user.refreshToken) {
      throw new HttpError(AUTH_CONFIG.ERRORS.TOKEN_INVALID, 401);
    }

    if (user.refreshTokenExpires && new Date() > user.refreshTokenExpires) {
      await this.clearRefreshToken(user);
      throw new HttpError(AUTH_CONFIG.ERRORS.REFRESH_TOKEN_EXPIRED, 401);
    }

    const isTokenValid = await compare(refreshToken, user.refreshToken);
    if (!isTokenValid) {
      await this.clearRefreshToken(user);
      throw new HttpError(AUTH_CONFIG.ERRORS.TOKEN_INVALID, 401);
    }

    const accessToken = generateAccessToken({
      id: user.id,
      name: user.name,
      role: user.role,
    });

    return {
      accessToken,
      user: this.sanitizeUser(user),
    };
  }

  private generateTokenPair(user: User): {
    accessToken: string;
    refreshToken: string;
  } {
    const tokenData = {
      id: user.id,
      name: user.name,
      role: user.role,
    };

    return {
      accessToken: generateAccessToken(tokenData),
      refreshToken: generateRefreshToken(tokenData),
    };
  }

  private async storeRefreshToken(
    user: User,
    refreshToken: string
  ): Promise<void> {
    user.refreshToken = await hash(refreshToken, AUTH_CONFIG.SALT_ROUNDS);
    user.refreshTokenExpires = new Date(
      Date.now() + AUTH_CONFIG.REFRESH_TOKEN_EXPIRY_MS
    );
    await this.userRepo.save(user);
  }

  private async clearRefreshToken(user: User): Promise<void> {
    user.refreshToken = null;
    user.refreshTokenExpires = null;
    await this.userRepo.save(user);
  }

  private sanitizeUser(
    user: User
  ): Omit<User, "password" | "refreshToken" | "refreshTokenExpires"> {
    const { password, refreshToken, refreshTokenExpires, ...userData } = user;
    return userData;
  }

  private async findUserByEmailWithPassword(
    email: string
  ): Promise<User | null> {
    return this.userRepo.findOne({
      where: { email },
      select: [
        "id",
        "email",
        "password",
        "name",
        "role",
        "refreshToken",
        "refreshTokenExpires",
        "bio",
        "specialty",
      ],
      relations: {
        address: true,
        services: {
          category: true,
        },
      },
    });
  }

  private async findUserById(id: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id },
      select: [
        "id",
        "email",
        "name",
        "role",
        "refreshToken",
        "refreshTokenExpires",
        "bio",
        "specialty",
      ],
      relations: {
        address: true,
        services: {
          category: true,
        },
      },
    });
  }

  async getUserById(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: {
        address: true,
        services: {
          category: true,
        },
      },
    });

    if (!user) {
      throw new HttpError(AUTH_CONFIG.ERRORS.USER_NOT_FOUND, 404);
    }

    return this.sanitizeUser(user);
  }

  async changeEmail(
    userId: string,
    newEmail: string,
    currentPassword: string
  ): Promise<AuthResponse> {
    const user = await this.findUserByIdWithPassword(userId);

    if (!user) {
      throw new HttpError(AUTH_CONFIG.ERRORS.USER_NOT_FOUND, 404);
    }

    const isPasswordValid = await compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new HttpError("Senha incorreta", 401);
    }

    const emailExists = await this.userRepo.findOne({
      where: { email: newEmail },
    });

    if (emailExists && emailExists.id !== userId) {
      throw new HttpError("Este email já está em uso", 409);
    }

    user.email = newEmail;

    const { accessToken, refreshToken } = this.generateTokenPair(user);
    await this.storeRefreshToken(user, refreshToken);

    await this.userRepo.save(user);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string
  ): Promise<AuthResponse> {
    const user = await this.findUserByIdWithPassword(userId);

    if (!user) {
      throw new HttpError(AUTH_CONFIG.ERRORS.USER_NOT_FOUND, 404);
    }

    const isPasswordValid = await compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new HttpError("Senha atual incorreta", 401);
    }

    if (newPassword.length < 6) {
      throw new HttpError("Nova senha deve ter no mínimo 6 caracteres", 400);
    }

    user.password = await hash(newPassword, AUTH_CONFIG.SALT_ROUNDS);

    const { accessToken, refreshToken } = this.generateTokenPair(user);
    await this.storeRefreshToken(user, refreshToken);

    await this.userRepo.save(user);

    return {
      accessToken,
      refreshToken,
      user: this.sanitizeUser(user),
    };
  }

  private async findUserByIdWithPassword(id: string): Promise<User | null> {
    return this.userRepo.findOne({
      where: { id },
      select: [
        "id",
        "email",
        "password",
        "name",
        "role",
        "refreshToken",
        "refreshTokenExpires",
        "bio",
        "specialty",
      ],
      relations: {
        address: true,
        services: {
          category: true,
        },
      },
    });
  }
}
