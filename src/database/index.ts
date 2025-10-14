import dotenv from "dotenv";
import { DataSource } from "typeorm";
import { Category } from "../entities/Category";
import { City } from "../entities/City";
import { Company } from "../entities/Company";
import { Profile } from "../entities/Profile";
import { Provider } from "../entities/Provider";
import { Service } from "../entities/Service";
import { State } from "../entities/State";
import { User } from "../entities/User";
import { Address } from "../entities/Address";

dotenv.config();

export const AppDataSource = new DataSource({
  type: "postgres",
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USER,
  password: String(process.env.DB_PASSWORD),
  database: process.env.DB_NAME,
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
});
