import "reflect-metadata";
import { app } from "./app";
import { AppDataSource } from "./database";

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;

AppDataSource.initialize()
  .then(() => {
    app.listen(PORT, () => {});
  })
  .catch((error) => {
    console.error("Erro ao conectar ao banco de dados", error);
    process.exit(1);
  });
