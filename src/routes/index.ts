import { Router } from "express";
import { authRoutes } from "./auth.routes";
import { categoryRoutes } from "./category.routes";
import { cityRoutes } from "./city.routes";
import { companyRoutes } from "./company.routes";
import { profileRoutes } from "./profile.routes";
import { providerRoutes } from "./provider.routes";
import { serviceRoutes } from "./service.routes";
import { stateRoutes } from "./state.routes";
import { userRoutes } from "./user.routes";

export const routes = Router();

routes.use("/auth", authRoutes);
routes.use("/categories", categoryRoutes);
routes.use("/cities", cityRoutes);
routes.use("/companies", companyRoutes);
routes.use("/profiles", profileRoutes);
routes.use("/providers", providerRoutes);
routes.use("/services", serviceRoutes);
routes.use("/states", stateRoutes);
routes.use("/users", userRoutes);
