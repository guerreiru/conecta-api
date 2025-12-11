import { Router } from "express";
import { SubscriptionController } from "../controllers/subscription.controller";
import { authenticate } from "../middlewares/authenticate";

const subscriptionRoutes = Router();

// Rota pública - lista planos disponíveis
subscriptionRoutes.get("/plans", SubscriptionController.getAvailablePlans);

// Rotas protegidas - requerem autenticação
subscriptionRoutes.post(
  "/checkout",
  authenticate,
  SubscriptionController.createCheckoutSession
);

subscriptionRoutes.get(
  "/me",
  authenticate,
  SubscriptionController.getMySubscription
);

subscriptionRoutes.delete(
  "/cancel",
  authenticate,
  SubscriptionController.cancelSubscription
);

// Webhook do Stripe - PÚBLICA mas validada pela assinatura
// IMPORTANTE: Esta rota precisa de express.raw() no app.ts
subscriptionRoutes.post("/webhook", SubscriptionController.handleWebhook);

export { subscriptionRoutes };
