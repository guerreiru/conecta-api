import { AppDataSource } from "../database";
import { Profile } from "../entities/Profile";
import { User } from "../entities/User";
import { UserRole } from "../types/UserRole";

export class ProfileService {
  private profileRepository = AppDataSource.getRepository(Profile);

  async create({
    type,
    user,
  }: {
    type: UserRole;
    user: User;
  }): Promise<Profile> {
    const profile = this.profileRepository.create({
      type,
      user,
    });

    return await this.profileRepository.save(profile);
  }

  async findAll(): Promise<Profile[]> {
    return await this.profileRepository.find({
      relations: ["company", "provider", "user"],
    });
  }

  async findById(id: string): Promise<Profile | null> {
    return this.profileRepository
      .createQueryBuilder("profile")
      .leftJoinAndSelect("profile.user", "user")
      .leftJoinAndSelect("profile.company", "company")
      .leftJoinAndSelect("profile.provider", "provider")
      .where("profile.id = :id", { id })
      .getOne();
  }

  async update(id: string, data: Partial<Profile>): Promise<Profile | null> {
    const profile = await this.profileRepository.findOneBy({ id });
    if (!profile) return null;

    Object.assign(profile, data);
    return await this.profileRepository.save(profile);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.profileRepository.delete(id);
    return !!result.affected;
  }
}
