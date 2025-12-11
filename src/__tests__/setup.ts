import { DataSource } from "typeorm";

// Mock do Stripe
jest.mock("stripe", () => {
  return jest.fn().mockImplementation(() => ({
    customers: {
      create: jest.fn(),
    },
    prices: {
      list: jest.fn(),
      create: jest.fn(),
      retrieve: jest.fn(),
    },
    products: {
      list: jest.fn(),
      create: jest.fn(),
    },
    checkout: {
      sessions: {
        create: jest.fn(),
      },
    },
    subscriptions: {
      retrieve: jest.fn(),
      update: jest.fn(),
    },
    webhooks: {
      constructEvent: jest.fn(),
    },
  }));
});

// Mock da conexão com o banco de dados
jest.mock("../database", () => ({
  AppDataSource: {
    getRepository: jest.fn(),
    initialize: jest.fn(),
    destroy: jest.fn(),
  },
}));

// Configurações globais de teste
beforeAll(() => {
  process.env.NODE_ENV = "test";
  process.env.STRIPE_SECRET_KEY = "sk_test_mock_key";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_mock_secret";
  process.env.FRONTEND_URL = "http://localhost:3000";
  process.env.ACCESS_TOKEN_SECRET = "test_access_secret";
  process.env.REFRESH_TOKEN_SECRET = "test_refresh_secret";
});

afterAll(() => {
  jest.clearAllMocks();
});
