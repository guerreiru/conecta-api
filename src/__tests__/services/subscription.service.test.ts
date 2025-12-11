import { SubscriptionService } from "../../services/subscription.service";
import { AppDataSource } from "../../database";
import { Subscription } from "../../entities/Subscription";
import { User } from "../../entities/User";
import { Service } from "../../entities/Service";
import { PlanType, SubscriptionStatus } from "../../types/PlanType";
import Stripe from "stripe";

describe("SubscriptionService", () => {
  let subscriptionService: SubscriptionService;
  let mockSubscriptionRepo: any;
  let mockUserRepo: any;
  let mockServiceRepo: any;
  let mockStripe: any;

  beforeEach(() => {
    // Mock repositories
    mockSubscriptionRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockUserRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockServiceRepo = {
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn(),
      })),
    };

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === Subscription) return mockSubscriptionRepo;
      if (entity === User) return mockUserRepo;
      if (entity === Service) return mockServiceRepo;
    });

    subscriptionService = new SubscriptionService();
    mockStripe = (subscriptionService as any).stripe;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("createCheckoutSession", () => {
    const mockUser = {
      id: "user-123",
      email: "test@example.com",
      name: "Test User",
      subscription: null,
    };

    it("deve criar uma sessão de checkout com sucesso", async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const mockCustomer = { id: "cus_123" };
      mockStripe.customers.create.mockResolvedValue(mockCustomer);

      // Mock products.list e products.create
      mockStripe.products.list.mockResolvedValue({ data: [] });
      mockStripe.products.create.mockResolvedValue({ id: "prod_123" });

      // Mock prices.list e prices.create
      const mockPrice = {
        id: "price_123",
        unit_amount: 1499,
        recurring: { interval: "month" },
      };
      mockStripe.prices.list.mockResolvedValue({ data: [] });
      mockStripe.prices.create.mockResolvedValue(mockPrice);

      const mockSession = {
        id: "cs_123",
        url: "https://checkout.stripe.com/test",
      };
      mockStripe.checkout.sessions.create.mockResolvedValue(mockSession);

      mockSubscriptionRepo.create.mockReturnValue({});
      mockSubscriptionRepo.save.mockResolvedValue({});

      const result = await subscriptionService.createCheckoutSession(
        "user-123",
        PlanType.PLUS
      );

      expect(result).toEqual({
        sessionId: "cs_123",
        url: "https://checkout.stripe.com/test",
      });
      expect(mockStripe.customers.create).toHaveBeenCalledWith({
        email: "test@example.com",
        name: "Test User",
        metadata: { userId: "user-123" },
      });
    });

    it("deve lançar erro ao tentar assinar plano FREE", async () => {
      await expect(
        subscriptionService.createCheckoutSession("user-123", PlanType.FREE)
      ).rejects.toThrow("Não é possível assinar o plano gratuito");
    });

    it("deve lançar erro se usuário já tem assinatura ativa", async () => {
      const userWithSub = {
        ...mockUser,
        subscription: {
          status: SubscriptionStatus.ACTIVE,
        },
      };

      mockUserRepo.findOne.mockResolvedValue(userWithSub);

      await expect(
        subscriptionService.createCheckoutSession("user-123", PlanType.PLUS)
      ).rejects.toThrow("Você já possui uma assinatura ativa");
    });

    it("deve lançar erro se usuário não for encontrado", async () => {
      mockUserRepo.findOne.mockResolvedValue(null);

      await expect(
        subscriptionService.createCheckoutSession("user-123", PlanType.PLUS)
      ).rejects.toThrow("Usuário não encontrado");
    });
  });

  describe("getUserSubscription", () => {
    it("deve retornar assinatura existente", async () => {
      const mockSubscription = {
        id: "sub-123",
        plan: PlanType.PLUS,
        status: SubscriptionStatus.ACTIVE,
      };

      const mockUser = {
        id: "user-123",
        subscription: mockSubscription,
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);

      const result = await subscriptionService.getUserSubscription("user-123");

      expect(result).toEqual(mockSubscription);
    });

    it("deve criar assinatura FREE se não existir", async () => {
      const mockUser = {
        id: "user-123",
        subscription: null,
      };

      const mockFreeSubscription = {
        plan: PlanType.FREE,
        status: SubscriptionStatus.ACTIVE,
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockSubscriptionRepo.create.mockReturnValue(mockFreeSubscription);
      mockSubscriptionRepo.save.mockResolvedValue(mockFreeSubscription);

      const result = await subscriptionService.getUserSubscription("user-123");

      expect(result).toEqual(mockFreeSubscription);
      expect(mockSubscriptionRepo.create).toHaveBeenCalledWith({
        user: mockUser,
        plan: PlanType.FREE,
        status: SubscriptionStatus.ACTIVE,
      });
    });

    it("deve desativar serviços se assinatura estiver vencida", async () => {
      const pastDate = new Date("2025-01-01");
      const mockSubscription = {
        id: "sub-123",
        plan: PlanType.PLUS,
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: pastDate,
      };

      const mockUser = {
        id: "user-123",
        hasActivePlan: true,
        subscription: mockSubscription,
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockSubscriptionRepo.save.mockResolvedValue({
        ...mockSubscription,
        plan: PlanType.FREE,
        status: SubscriptionStatus.CANCELED,
      });

      const result = await subscriptionService.getUserSubscription("user-123");

      expect(result.plan).toBe(PlanType.FREE);
      expect(result.status).toBe(SubscriptionStatus.CANCELED);
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ hasActivePlan: false })
      );
      expect(mockServiceRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe("cancelSubscription", () => {
    it("deve cancelar assinatura com sucesso", async () => {
      const mockSubscription = {
        stripeSubscriptionId: "sub_stripe_123",
        status: SubscriptionStatus.ACTIVE,
        currentPeriodEnd: new Date("2026-01-01"),
      };

      const mockUser = {
        id: "user-123",
        subscription: mockSubscription,
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockStripe.subscriptions.update.mockResolvedValue({});

      const result = await subscriptionService.cancelSubscription("user-123");

      expect(result).toEqual({
        message: "Assinatura será cancelada no final do período atual",
        cancelAt: mockSubscription.currentPeriodEnd,
      });
      expect(mockStripe.subscriptions.update).toHaveBeenCalledWith(
        "sub_stripe_123",
        { cancel_at_period_end: true }
      );
    });

    it("deve lançar erro se assinatura não for encontrada", async () => {
      mockUserRepo.findOne.mockResolvedValue({ id: "user-123" });

      await expect(
        subscriptionService.cancelSubscription("user-123")
      ).rejects.toThrow("Assinatura não encontrada");
    });

    it("deve lançar erro se assinatura já estiver cancelada", async () => {
      const mockUser = {
        id: "user-123",
        subscription: {
          status: SubscriptionStatus.CANCELED,
          stripeSubscriptionId: "sub_123",
        },
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);

      await expect(
        subscriptionService.cancelSubscription("user-123")
      ).rejects.toThrow("Assinatura já está cancelada");
    });
  });

  describe("handleWebhook", () => {
    const mockRawBody = Buffer.from("test");
    const mockSignature = "test_signature";

    it("deve processar evento customer.subscription.created", async () => {
      const mockEvent = {
        type: "customer.subscription.created",
        data: {
          object: {
            id: "sub_123",
            customer: "cus_123",
            status: "active",
            items: {
              data: [{ price: { id: "price_123" } }],
            },
            current_period_start: 1704067200,
            current_period_end: 1735689600,
            metadata: {
              userId: "user-123",
              planType: "plus",
            },
          },
        },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);

      const mockUser = {
        id: "user-123",
        subscription: null,
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockStripe.prices.retrieve.mockResolvedValue({
        id: "price_123",
        unit_amount: 1499,
      });
      mockSubscriptionRepo.create.mockReturnValue({});
      mockSubscriptionRepo.save.mockResolvedValue({});

      const result = await subscriptionService.handleWebhook(
        mockRawBody,
        mockSignature
      );

      expect(result).toEqual({ received: true });
      expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith(
        mockRawBody,
        mockSignature,
        expect.any(String)
      );
    });

    it("deve lançar erro se assinatura do webhook falhar", async () => {
      mockStripe.webhooks.constructEvent.mockImplementation(() => {
        throw new Error("Invalid signature");
      });

      await expect(
        subscriptionService.handleWebhook(mockRawBody, mockSignature)
      ).rejects.toThrow("Webhook signature verification failed");
    });

    it("deve processar evento invoice.payment_succeeded", async () => {
      const mockEvent = {
        type: "invoice.payment_succeeded",
        data: {
          object: {
            subscription: "sub_123",
          },
        },
      };

      const mockSubscription = {
        stripeSubscriptionId: "sub_123",
        status: SubscriptionStatus.TRIALING,
        user: { id: "user-123" },
      };

      mockStripe.webhooks.constructEvent.mockReturnValue(mockEvent);
      mockSubscriptionRepo.findOne.mockResolvedValue(mockSubscription);
      mockSubscriptionRepo.save.mockResolvedValue({
        ...mockSubscription,
        status: SubscriptionStatus.ACTIVE,
      });

      const result = await subscriptionService.handleWebhook(
        mockRawBody,
        mockSignature
      );

      expect(result).toEqual({ received: true });
      expect(mockSubscriptionRepo.save).toHaveBeenCalled();
      expect(mockUserRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ hasActivePlan: true })
      );
    });
  });

  describe("getAvailablePlans", () => {
    it("deve retornar todos os planos disponíveis", () => {
      const plans = subscriptionService.getAvailablePlans();

      expect(plans).toHaveLength(4);
      expect(plans).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "free" }),
          expect.objectContaining({ id: "plus" }),
          expect.objectContaining({ id: "premium" }),
          expect.objectContaining({ id: "enterprise" }),
        ])
      );
    });
  });
});
