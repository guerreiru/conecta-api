import cors from "cors";
import express, { Request, Response } from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import "reflect-metadata";
import rateLimit from "express-rate-limit";

import { errorMiddleware } from "./middlewares/errorMiddleware";
import { routes } from "./routes";

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: ["https://conecta-theta-lime.vercel.app", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

const limiter = rateLimit({
  windowMs: 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Muitas requisições, tente novamente em breve." },
});
app.use(limiter);

app.get("/", (_: Request, res: Response) => {
  res.send("API está rodando!");
});

app.use(routes);

app.use(errorMiddleware);

export { app };
