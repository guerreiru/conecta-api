import Stripe from "stripe";
import { AppDataSource } from "../database";
import { Subscription } from "../entities/Subscription";
import { User } from "../entities/User";
import { Service } from "../entities/Service";
import { HttpError } from "../utils/httpError";
import { PlanType, PLAN_CONFIGS, SubscriptionStatus } from "../types/PlanType";

export class SubscriptionService {
  private stripe: Stripe;
  private subscriptionRepo = AppDataSource.getRepository(Subscription);
  private userRepo = AppDataSource.getRepository(User);
  private serviceRepo = AppDataSource.getRepository(Service);
  private webhookSecret: string;

  constructor() {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const frontendUrl = process.env.FRONTEND_URL;

    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY não configurada");
    }

    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET não configurada");
    }

    if (!frontendUrl) {
      throw new Error("FRONTEND_URL não configurada");
    }

    if (
      !frontendUrl.startsWith("http://") &&
      !frontendUrl.startsWith("https://")
    ) {
      throw new Error(
        "FRONTEND_URL deve começar com http:// ou https:// (ex: http://localhost:3000)"
      );
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2025-11-17.clover",
    });

    this.webhookSecret = webhookSecret;
  }

  /**
   * Lista todos os planos disponíveis
   * Rota pública
   */
  getAvailablePlans() {
    return Object.entries(PLAN_CONFIGS).map(([key, config]) => ({
      id: key,
      ...config,
    }));
  }

  /**
   * Cria uma sessão de checkout no Stripe
   * SEGURANÇA: Todos os valores são obtidos do backend, não do cliente
   */
  async createCheckoutSession(userId: string, planType: PlanType) {
    // Validação 1: Não permitir plano FREE
    if (planType === PlanType.FREE) {
      throw new HttpError("Não é possível assinar o plano gratuito", 400);
    }

    // Validação 2: Verificar se o plano existe
    const planConfig = PLAN_CONFIGS[planType];
    if (!planConfig) {
      throw new HttpError("Plano inválido", 400);
    }

    // Validação 3: Buscar usuário
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ["subscription"],
    });

    if (!user) {
      throw new HttpError("Usuário não encontrado", 404);
    }

    // Validação 4: Verificar se já tem assinatura ativa
    if (
      user.subscription &&
      user.subscription.status === SubscriptionStatus.ACTIVE
    ) {
      throw new HttpError(
        "Você já possui uma assinatura ativa. Cancele a atual antes de assinar um novo plano.",
        409
      );
    }

    // Criar ou buscar cliente no Stripe
    let stripeCustomerId = user.subscription?.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        name: user.name,
        metadata: {
          userId: user.id,
        },
      });
      stripeCustomerId = customer.id;
    }

    // SEGURANÇA CRÍTICA: Preço vem SEMPRE do backend
    const priceInCents = planConfig.price;

    // Criar ou buscar o Price no Stripe
    const stripePriceId = await this.getOrCreateStripePrice(
      planType,
      priceInCents
    );

    // Criar sessão de checkout
    const session = await this.stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${process.env.FRONTEND_URL}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/plans?canceled=true`,
      metadata: {
        userId: user.id,
        planType: planType,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
          planType: planType,
        },
      },
    });

    // Criar ou atualizar registro de assinatura (status PENDING)
    if (!user.subscription) {
      const subscription = this.subscriptionRepo.create({
        user: user,
        plan: planType,
        status: SubscriptionStatus.TRIALING,
        stripeCustomerId: stripeCustomerId,
      });
      await this.subscriptionRepo.save(subscription);
    } else {
      user.subscription.stripeCustomerId = stripeCustomerId;
      await this.subscriptionRepo.save(user.subscription);
    }

    return {
      sessionId: session.id,
      url: session.url,
    };
  }

  /**
   * Webhook do Stripe - VALIDAÇÃO TOTAL NO BACKEND
   * Todos os dados vêm do Stripe, não do cliente
   */
  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      // SEGURANÇA: Verificar assinatura do webhook
      event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret
      );
    } catch (err: any) {
      throw new HttpError(
        `Webhook signature verification failed: ${err.message}`,
        400
      );
    }

    // Processar eventos do Stripe
    switch (event.type) {
      case "checkout.session.completed":
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case "customer.subscription.deleted":
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case "invoice.payment_succeeded":
        await this.handlePaymentSucceeded(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  /**
   * Manipula conclusão do checkout
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.metadata?.userId;
    const planType = session.metadata?.planType as PlanType;

    if (!userId || !planType) {
      console.error("Missing metadata in checkout session");
      return;
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ["subscription"],
    });

    if (!user) {
      console.error(`User not found: ${userId}`);
      return;
    }

    // Buscar assinatura no Stripe para obter todos os dados
    if (session.subscription && typeof session.subscription === "string") {
      const stripeSubscription = await this.stripe.subscriptions.retrieve(
        session.subscription
      );

      await this.updateSubscriptionFromStripe(
        user,
        stripeSubscription,
        planType
      );
    }
  }

  /**
   * Manipula atualização de assinatura
   */
  private async handleSubscriptionUpdated(
    stripeSubscription: Stripe.Subscription
  ) {
    const userId = stripeSubscription.metadata?.userId;
    const planType = stripeSubscription.metadata?.planType as PlanType;

    if (!userId || !planType) {
      console.error("Missing metadata in subscription");
      return;
    }

    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ["subscription"],
    });

    if (!user) {
      console.error(`User not found: ${userId}`);
      return;
    }

    await this.updateSubscriptionFromStripe(user, stripeSubscription, planType);
  }

  /**
   * Manipula cancelamento de assinatura
   */
  private async handleSubscriptionDeleted(
    stripeSubscription: Stripe.Subscription
  ) {
    const subscription = await this.subscriptionRepo.findOne({
      where: { stripeSubscriptionId: stripeSubscription.id },
      relations: ["user"],
    });

    if (!subscription) {
      console.error(`Subscription not found: ${stripeSubscription.id}`);
      return;
    }

    // Atualizar para plano FREE
    subscription.plan = PlanType.FREE;
    subscription.status = SubscriptionStatus.CANCELED;
    subscription.canceledAt = new Date();
    subscription.currentPeriodEnd = new Date(
      (stripeSubscription as any).current_period_end * 1000
    );

    await this.subscriptionRepo.save(subscription);

    // Atualizar usuário
    subscription.user.hasActivePlan = false;
    await this.userRepo.save(subscription.user);

    // Desativar serviços e remover destaques ao cancelar
    await this.deactivateAndRemoveHighlights(subscription.user.id);
  }

  /**
   * Manipula pagamento bem-sucedido
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice) {
    const invoiceData = invoice as any;
    const subscriptionId =
      typeof invoiceData.subscription === "string"
        ? invoiceData.subscription
        : invoiceData.subscription?.id;

    if (!subscriptionId) {
      return;
    }

    const subscription = await this.subscriptionRepo.findOne({
      where: { stripeSubscriptionId: subscriptionId },
      relations: ["user"],
    });

    if (!subscription) {
      console.error(`Subscription not found: ${subscriptionId}`);
      return;
    }

    // Garantir que o status está ativo
    if (subscription.status !== SubscriptionStatus.ACTIVE) {
      subscription.status = SubscriptionStatus.ACTIVE;
      await this.subscriptionRepo.save(subscription);

      subscription.user.hasActivePlan = true;
      await this.userRepo.save(subscription.user);
    }
  }

  /**
   * Manipula falha de pagamento
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice) {
    const invoiceData = invoice as any;
    const subscriptionId =
      typeof invoiceData.subscription === "string"
        ? invoiceData.subscription
        : invoiceData.subscription?.id;

    if (!subscriptionId) {
      return;
    }

    const subscription = await this.subscriptionRepo.findOne({
      where: { stripeSubscriptionId: subscriptionId },
      relations: ["user"],
    });

    if (!subscription) {
      console.error(`Subscription not found: ${subscriptionId}`);
      return;
    }

    // Marcar como atrasado
    subscription.status = SubscriptionStatus.PAST_DUE;
    await this.subscriptionRepo.save(subscription);
  }

  /**
   * Atualiza assinatura local com dados do Stripe
   * SEGURANÇA: Todos os dados vêm do Stripe, não do cliente
   */
  private async updateSubscriptionFromStripe(
    user: User,
    stripeSubscription: Stripe.Subscription,
    planType: PlanType
  ) {
    // VALIDAÇÃO CRÍTICA: Verificar se o preço cobrado corresponde ao plano
    const expectedPrice = PLAN_CONFIGS[planType].price;
    const stripePriceId = stripeSubscription.items.data[0].price.id;
    const stripePrice = await this.stripe.prices.retrieve(stripePriceId);

    if (stripePrice.unit_amount !== expectedPrice) {
      console.error(
        `Price mismatch! Expected: ${expectedPrice}, Got: ${stripePrice.unit_amount}`
      );
      throw new Error("Price validation failed");
    }

    let subscription = user.subscription;

    if (!subscription) {
      subscription = this.subscriptionRepo.create({
        user: user,
      });
    }

    // Atualizar com dados do Stripe
    subscription.plan = planType;
    subscription.status = stripeSubscription.status as SubscriptionStatus;
    subscription.stripeCustomerId = stripeSubscription.customer as string;
    subscription.stripeSubscriptionId = stripeSubscription.id;
    subscription.stripePriceId = stripePriceId;
    subscription.currentPeriodStart = new Date(
      (stripeSubscription as any).current_period_start * 1000
    );
    subscription.currentPeriodEnd = new Date(
      (stripeSubscription as any).current_period_end * 1000
    );

    if (stripeSubscription.canceled_at) {
      subscription.canceledAt = new Date(stripeSubscription.canceled_at * 1000);
    }

    await this.subscriptionRepo.save(subscription);

    // Atualizar flag do usuário
    const isActive =
      stripeSubscription.status === "active" ||
      stripeSubscription.status === "trialing";
    user.hasActivePlan = isActive;
    await this.userRepo.save(user);

    // Verificar se precisa ajustar destaques (downgrade de plano)
    const newHighlightLimit = PLAN_CONFIGS[planType].highlightLimit;
    await this.removeExcessHighlights(user.id, newHighlightLimit);
  }

  /**
   * Busca ou cria um Price no Stripe
   */
  private async getOrCreateStripePrice(
    planType: PlanType,
    priceInCents: number
  ): Promise<string> {
    // Buscar product no Stripe ou criar
    const productId = await this.getOrCreateStripeProduct(planType);

    // Buscar prices existentes
    const prices = await this.stripe.prices.list({
      product: productId,
      active: true,
    });

    // Verificar se existe price com o valor correto
    const existingPrice = prices.data.find(
      (p) => p.unit_amount === priceInCents && p.recurring?.interval === "month"
    );

    if (existingPrice) {
      return existingPrice.id;
    }

    // Criar novo price
    const price = await this.stripe.prices.create({
      product: productId,
      unit_amount: priceInCents,
      currency: "brl",
      recurring: {
        interval: "month",
      },
    });

    return price.id;
  }

  /**
   * Busca ou cria um Product no Stripe
   */
  private async getOrCreateStripeProduct(planType: PlanType): Promise<string> {
    const planConfig = PLAN_CONFIGS[planType];

    // Buscar products existentes
    const products = await this.stripe.products.list({
      active: true,
    });

    // Buscar por metadata
    const existingProduct = products.data.find(
      (p) => p.metadata?.planType === planType
    );

    if (existingProduct) {
      return existingProduct.id;
    }

    // Criar novo product
    const product = await this.stripe.products.create({
      name: `ProLocal ${planConfig.name}`,
      description: planConfig.features.join(", "),
      metadata: {
        planType: planType,
      },
    });

    return product.id;
  }

  /**
   * Busca assinatura do usuário
   * Verifica se está vencida e desativa serviços se necessário
   */
  async getUserSubscription(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ["subscription"],
    });

    if (!user) {
      throw new HttpError("Usuário não encontrado", 404);
    }

    if (!user.subscription) {
      // Criar assinatura FREE se não existir
      const freeSubscription = this.subscriptionRepo.create({
        user: user,
        plan: PlanType.FREE,
        status: SubscriptionStatus.ACTIVE,
      });
      await this.subscriptionRepo.save(freeSubscription);
      return freeSubscription;
    }

    // Verificar se assinatura está vencida
    const subscription = user.subscription;
    const now = new Date();

    if (
      subscription.plan !== PlanType.FREE &&
      subscription.currentPeriodEnd &&
      subscription.currentPeriodEnd < now &&
      subscription.status === SubscriptionStatus.ACTIVE
    ) {
      // Assinatura vencida - reverter para FREE
      subscription.plan = PlanType.FREE;
      subscription.status = SubscriptionStatus.CANCELED;
      subscription.canceledAt = now;
      await this.subscriptionRepo.save(subscription);

      // Atualizar flag do usuário
      user.hasActivePlan = false;
      await this.userRepo.save(user);

      // Desativar todos os serviços e remover destaques
      await this.deactivateAndRemoveHighlights(userId);
    }

    return subscription;
  }

  /**
   * Desativa todos os serviços do usuário E remove todos os destaques
   * Chamado quando a assinatura expira ou volta para plano FREE
   */
  private async deactivateAndRemoveHighlights(userId: string) {
    await this.serviceRepo
      .createQueryBuilder()
      .update(Service)
      .set({
        isActive: false,
        isHighlighted: false,
        highlightLevel: undefined,
      })
      .where("userId = :userId", { userId })
      .execute();
  }

  /**
   * Remove destaques excedentes quando há downgrade de plano
   * Mantém apenas os N primeiros serviços destacados (ordenados por data de criação)
   */
  private async removeExcessHighlights(userId: string, newLimit: number) {
    if (newLimit === 0) {
      // Se o novo limite é 0 (FREE), remove todos os destaques
      await this.serviceRepo
        .createQueryBuilder()
        .update(Service)
        .set({
          isHighlighted: false,
          highlightLevel: undefined,
        })
        .where("userId = :userId", { userId })
        .andWhere("isHighlighted = :highlighted", { highlighted: true })
        .execute();
      return;
    }

    // Buscar todos os serviços destacados ordenados por data de criação
    const highlightedServices = await this.serviceRepo.find({
      where: {
        user: { id: userId },
        isHighlighted: true,
      },
      order: { createdAt: "ASC" },
    });

    // Se tem mais destaques que o permitido, remover os excedentes
    if (highlightedServices.length > newLimit) {
      const servicesToRemoveHighlight = highlightedServices.slice(newLimit);
      const idsToUpdate = servicesToRemoveHighlight.map((s) => s.id);

      if (idsToUpdate.length > 0) {
        await this.serviceRepo
          .createQueryBuilder()
          .update(Service)
          .set({
            isHighlighted: false,
            highlightLevel: undefined,
          })
          .where("id IN (:...ids)", { ids: idsToUpdate })
          .execute();
      }
    }
  }

  /**
   * Cancela assinatura do usuário
   */
  async cancelSubscription(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: ["subscription"],
    });

    if (!user || !user.subscription) {
      throw new HttpError("Assinatura não encontrada", 404);
    }

    const subscription = user.subscription;

    if (!subscription.stripeSubscriptionId) {
      throw new HttpError("Assinatura não possui ID do Stripe", 400);
    }

    if (subscription.status === SubscriptionStatus.CANCELED) {
      throw new HttpError("Assinatura já está cancelada", 400);
    }

    // Cancelar no Stripe (no final do período)
    await this.stripe.subscriptions.update(subscription.stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    return {
      message: "Assinatura será cancelada no final do período atual",
      cancelAt: subscription.currentPeriodEnd,
    };
  }
}
