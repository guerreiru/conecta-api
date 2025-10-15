import { AppDataSource } from "../database";
import { State } from "../entities/State";
import { HttpError } from "../utils/httpError";

export class StateService {
  private stateRepository = AppDataSource.getRepository(State);

  async create({
    name,
    acronym,
  }: {
    name: string;
    acronym: string;
  }): Promise<State> {
    const nameLowerCase = name.toLowerCase();
    const acronymLowerCase = acronym.toLowerCase();

    const existingState = await this.findByName(nameLowerCase);
    const existingAcronym = await this.findByAcronym(acronymLowerCase);

    if (existingState) {
      throw new HttpError("Este estado já está cadastrado", 409);
    }

    if (existingAcronym) {
      throw new HttpError("Este acrônimo já está cadastrado", 409);
    }

    const state = this.stateRepository.create({
      name: nameLowerCase,
      acronym: acronymLowerCase,
    });

    return await this.stateRepository.save(state);
  }

  async createMany(
    states: State[]
  ): Promise<{ success: State[]; errors: any[] }> {
    const success: State[] = [];
    const errors: any[] = [];

    for (const stateData of states) {
      const { name, acronym } = stateData;
      try {
        const savedState = await this.create({ name, acronym });
        success.push(savedState);
      } catch (error) {
        if (error instanceof HttpError) {
          errors.push({
            state: stateData,
            error: error?.message || "Erro desconhecido",
          });
        } else {
          errors.push({
            state: stateData,
            error: "Erro desconhecido",
          });
        }
      }
    }

    return { success, errors };
  }

  async findAll(): Promise<State[]> {
    return await this.stateRepository.find({
      relations: ["cities"],
      order: {
        name: "ASC",
      },
    });
  }

  async findById(id: string): Promise<State | null> {
    return await this.stateRepository.findOne({
      where: { id },
      relations: ["cities"],
    });
  }

  async update(id: string, data: Partial<State>): Promise<State | null> {
    const state = await this.stateRepository.findOneBy({ id });
    if (!state) return null;

    Object.assign(state, data);
    return await this.stateRepository.save(state);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.stateRepository.delete(id);
    return !!result.affected;
  }

  async findByName(name: string): Promise<State | null> {
    return await this.stateRepository.findOne({ where: { name } });
  }

  async findByAcronym(acronym: string): Promise<State | null> {
    return await this.stateRepository.findOne({ where: { acronym } });
  }
}
