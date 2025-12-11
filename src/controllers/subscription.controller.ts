import { Request, Response } from "express";
import { SubscriptionService } from "../services/subscription.service";
import { HttpError } from "../utils/httpError";
import { PlanType } from "../types/PlanType";

const subscriptionService = new SubscriptionService();

export class SubscriptionController {
  /**
   * Cria sessão de checkout do Stripe
   * Rota protegida - requer autenticação
   */
  static async createCheckoutSession(req: Request, res: Response) {
    const userId = req.user?.id;
    const { planType } = req.body;

    if (!userId) {
      throw new HttpError("Usuário não autenticado", 401);
    }

    if (!planType || !Object.values(PlanType).includes(planType)) {
      throw new HttpError("Tipo de plano inválido", 400);
    }

    try {
      const session = await subscriptionService.createCheckoutSession(
        userId,
        planType
      );

      return res.status(200).json(session);
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      throw error;
    }
  }

  /**
   * Webhook do Stripe
   * Rota PÚBLICA - validada pela assinatura do Stripe
   * CRÍTICO: Usa raw body (Buffer) para validação de assinatura
   */
  static async handleWebhook(req: Request, res: Response) {
    const signature = req.headers["stripe-signature"];

    if (!signature || typeof signature !== "string") {
      return res.status(400).json({ message: "Missing stripe-signature header" });
    }

    try {
      // req.body deve ser Buffer (configurado com express.raw)
      const result = await subscriptionService.handleWebhook(
        req.body,
        signature
      );

      return res.status(200).json(result);
    } catch (error: any) {
      console.error("Webhook error:", error.message);
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      return res.status(400).json({ message: "Webhook processing failed" });
    }
  }

  /**
   * Retorna assinatura do usuário autenticado
   * Rota protegida
   */
  static async getMySubscription(req: Request, res: Response) {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError("Usuário não autenticado", 401);
    }

    try {
      const subscription = await subscriptionService.getUserSubscription(
        userId
      );

      return res.status(200).json(subscription);
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      throw error;
    }
  }

  /**
   * Cancela assinatura do usuário
   * Rota protegida
   */
  static async cancelSubscription(req: Request, res: Response) {
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError("Usuário não autenticado", 401);
    }

    try {
      const result = await subscriptionService.cancelSubscription(userId);

      return res.status(200).json(result);
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      throw error;
    }
  }

  /**
   * Lista planos disponíveis
   * Rota PÚBLICA
   */
  static async getAvailablePlans(_req: Request, res: Response) {
    const plans = subscriptionService.getAvailablePlans();
    return res.status(200).json(plans);
  }
}
