import request from "supertest";
import express from "express";
import { PlanType } from "../../types/PlanType";

// Mock do controller
const mockGetAvailablePlans = jest.fn();
const mockCreateCheckoutSession = jest.fn();
const mockGetUserSubscription = jest.fn();
const mockCancelSubscription = jest.fn();
const mockHandleWebhook = jest.fn();

jest.mock("../../controllers/subscription.controller", () => ({
  SubscriptionController: {
    getAvailablePlans: (req: any, res: any) => mockGetAvailablePlans(req, res),
    createCheckoutSession: (req: any, res: any) =>
      mockCreateCheckoutSession(req, res),
    getMySubscription: (req: any, res: any) =>
      mockGetUserSubscription(req, res),
    cancelSubscription: (req: any, res: any) =>
      mockCancelSubscription(req, res),
    handleWebhook: (req: any, res: any) => mockHandleWebhook(req, res),
  },
}));

// Mock do middleware authenticate
jest.mock("../../middlewares/authenticate", () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: "user-123", email: "test@example.com" };
    next();
  },
}));

const app = express();
app.use(express.json());

// Importar rotas após os mocks
import { subscriptionRoutes } from "../../routes/subscription.routes";
app.use("/subscriptions", subscriptionRoutes);

describe("Subscription Routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("GET /subscriptions/plans", () => {
    it("deve retornar lista de planos disponíveis", async () => {
      const mockPlans = [
        { id: "free", name: "Gratuito", price: 0 },
        { id: "plus", name: "Plus", price: 1499 },
      ];

      mockGetAvailablePlans.mockImplementation((req, res) => {
        res.status(200).json(mockPlans);
      });

      const response = await request(app).get("/subscriptions/plans");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockPlans);
    });
  });

  describe("POST /subscriptions/checkout", () => {
    it("deve criar sessão de checkout com sucesso", async () => {
      const mockSession = {
        sessionId: "cs_test_123",
        url: "https://checkout.stripe.com/test",
      };

      mockCreateCheckoutSession.mockImplementation((req, res) => {
        res.status(200).json(mockSession);
      });

      const response = await request(app)
        .post("/subscriptions/checkout")
        .send({ planType: PlanType.PLUS });

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSession);
    });

    it("deve retornar 400 se planType for inválido", async () => {
      mockCreateCheckoutSession.mockImplementation((req, res) => {
        res.status(400).json({ message: "Tipo de plano inválido" });
      });

      const response = await request(app)
        .post("/subscriptions/checkout")
        .send({ planType: "invalid" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("Tipo de plano inválido");
    });

    it("deve retornar 400 se planType não for enviado", async () => {
      mockCreateCheckoutSession.mockImplementation((req, res) => {
        res.status(400).json({ message: "Tipo de plano inválido" });
      });

      const response = await request(app)
        .post("/subscriptions/checkout")
        .send({});

      expect(response.status).toBe(400);
    });
  });

  describe("GET /subscriptions/me", () => {
    it("deve retornar assinatura do usuário autenticado", async () => {
      const mockSubscription = {
        id: "sub-123",
        plan: PlanType.PLUS,
        status: "active",
      };

      mockGetUserSubscription.mockImplementation((req, res) => {
        res.status(200).json(mockSubscription);
      });

      const response = await request(app).get("/subscriptions/me");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(mockSubscription);
    });
  });

  describe("DELETE /subscriptions/cancel", () => {
    it("deve cancelar assinatura com sucesso", async () => {
      const mockResponse = {
        message: "Assinatura será cancelada no final do período atual",
        cancelAt: new Date("2026-01-01").toISOString(),
      };

      mockCancelSubscription.mockImplementation((req, res) => {
        res.status(200).json(mockResponse);
      });

      const response = await request(app).delete("/subscriptions/cancel");

      expect(response.status).toBe(200);
      expect(response.body).toEqual(
        expect.objectContaining({
          message: expect.any(String),
        })
      );
    });
  });

  describe("POST /subscriptions/webhook", () => {
    it("deve processar webhook do Stripe", async () => {
      mockHandleWebhook.mockImplementation((req, res) => {
        res.status(200).json({ received: true });
      });

      const response = await request(app)
        .post("/subscriptions/webhook")
        .set("stripe-signature", "test_signature")
        .send({ type: "customer.subscription.created" });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ received: true });
    });

    it("deve retornar 400 se stripe-signature estiver ausente", async () => {
      mockHandleWebhook.mockImplementation((req, res) => {
        res.status(400).json({ message: "Missing stripe-signature header" });
      });

      const response = await request(app)
        .post("/subscriptions/webhook")
        .send({ type: "test" });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain("stripe-signature");
    });
  });
});
