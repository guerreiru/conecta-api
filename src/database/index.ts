import dotenv from "dotenv";
import { DataSource } from "typeorm";
import { Address } from "../entities/Address";
import { Category } from "../entities/Category";
import { City } from "../entities/City";
import { Company } from "../entities/Company";
import { Profile } from "../entities/Profile";
import { Provider } from "../entities/Provider";
import { Service } from "../entities/Service";
import { State } from "../entities/State";
import { User } from "../entities/User";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  synchronize: true,
  logging: false,
  entities: [
    Address,
    Category,
    City,
    Company,
    Profile,
    Provider,
    Service,
    State,
    User,
  ],
  migrations: [],
  subscribers: [],
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});
