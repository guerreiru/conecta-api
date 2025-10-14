import cors from "cors";
import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import "reflect-metadata";

import { errorMiddleware } from "./middlewares/errorMiddleware";
import { routes } from "./routes";

const app = express();

app.use(
  cors({
    origin: "https://conecta-theta-lime.vercel.app",
    credentials: true,
  })
);

app.use(helmet());
app.use(express.json());
app.use(cookieParser());

app.use(routes);

app.use(errorMiddleware);

app.get("/", (_: Request, res: Response) => {
  res.send("API está rodando!");
});

export { app };
