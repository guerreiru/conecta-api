import { FindOperator, ILike } from "typeorm";
import { AppDataSource } from "../database";
import { City } from "../entities/City";
import { State } from "../entities/State";
import { HttpError } from "../utils/httpError";

type FindAllWhereOptions = {
  name?: FindOperator<string>;
  state?: {
    id: string;
  };
};

export class CityService {
  private stateRepository = AppDataSource.getRepository(State);
  private cityRepository = AppDataSource.getRepository(City);

  async create({
    name,
    stateId,
  }: {
    name: string;
    stateId: string;
  }): Promise<City> {
    const state = await this.stateRepository.findOne({
      where: {
        id: stateId,
      },
    });

    if (!state) {
      throw new HttpError("Estado não encontrado", 404);
    }

    const cityAlreadyExists = await this.findByNameAndStateId(name, stateId);

    if (cityAlreadyExists) {
      throw new HttpError("Essa cidade já existe para esse estado", 404);
    }

    const city = this.cityRepository.create({
      name,
      state,
    });

    return await this.cityRepository.save(city);
  }

  async createMany(
    cities: City[],
    stateId: string
  ): Promise<{ success: City[]; errors: any[] }> {
    const success: City[] = [];
    const errors: any[] = [];

    for (const cityData of cities) {
      const { name } = cityData;
      try {
        const savedCity = await this.create({ name, stateId });
        success.push(savedCity);
      } catch (error) {
        if (error instanceof HttpError) {
          errors.push({
            city: cityData,
            error: error?.message || "Erro desconhecido",
          });
        } else {
          errors.push({
            city: cityData,
            error: "Erro desconhecido",
          });
        }
      }
    }

    return { success, errors };
  }

  async findById(id: string): Promise<City | null> {
    return await this.cityRepository.findOne({
      where: { id },
      relations: ["state"],
    });
  }

  async findAllByStateId(id: string): Promise<City[] | null> {
    return await this.cityRepository.find({
      where: {
        state: {
          id,
        },
      },
    });
  }

  async findByNameAndStateId(
    name: string,
    stateId: string
  ): Promise<City | null> {
    return await this.cityRepository.findOne({
      where: {
        name,
        state: {
          id: stateId,
        },
      },
    });
  }

  async findAll({
    name,
    stateId,
  }: {
    name?: string;
    stateId?: string;
  }): Promise<City[]> {
    const cityRepository = AppDataSource.getRepository(City);

    const where: FindAllWhereOptions = {};

    if (name) {
      where.name = ILike(`%${name}%`);
    }

    if (stateId) {
      where.state = { id: stateId };
    }

    return await cityRepository.find({
      where,
      order: { name: "ASC" },
    });
  }

  async update(id: string, data: Partial<City>): Promise<City | null> {
    const state = await this.cityRepository.findOneBy({ id });
    if (!state) return null;

    Object.assign(state, data);
    return await this.cityRepository.save(state);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.cityRepository.delete(id);
    return !!result.affected;
  }

  async findByName(name: string): Promise<City | null> {
    return await this.cityRepository.findOne({ where: { name } });
  }
}
