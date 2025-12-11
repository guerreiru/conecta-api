export enum PlanType {
  FREE = "free",
  PLUS = "plus",
  PREMIUM = "premium",
  ENTERPRISE = "enterprise",
}

export enum SubscriptionStatus {
  ACTIVE = "active",
  CANCELED = "canceled",
  PAST_DUE = "past_due",
  UNPAID = "unpaid",
  TRIALING = "trialing",
}

export type PlanConfig = {
  name: string;
  price: number; // em centavos
  serviceLimit: number | null; // null = ilimitado
  highlightLimit: number; // quantos serviços podem ser destacados
  highlightLevel?: "plus" | "premium" | "enterprise";
  features: string[];
};

export const PLAN_CONFIGS: Record<PlanType, PlanConfig> = {
  [PlanType.FREE]: {
    name: "Gratuito",
    price: 0,
    serviceLimit: 1,
    highlightLimit: 0, // FREE não pode destacar
    features: ["1 serviço cadastrado", "Listagem básica"],
  },
  [PlanType.PLUS]: {
    name: "Plus",
    price: 1499, // R$ 14,99
    serviceLimit: 5,
    highlightLimit: 2, // PLUS pode destacar 2 serviços
    highlightLevel: "plus",
    features: [
      "Até 5 serviços",
      "Destaque Plus em 2 serviços",
      "Estatísticas básicas",
      "Suporte prioritário",
    ],
  },
  [PlanType.PREMIUM]: {
    name: "Premium",
    price: 2199, // R$ 21,99
    serviceLimit: 15,
    highlightLimit: 5, // PREMIUM pode destacar 5 serviços
    highlightLevel: "premium",
    features: [
      "Até 15 serviços",
      "Destaque Premium em 5 serviços",
      "Estatísticas avançadas",
      "Suporte 24/7",
      "Badge de verificação",
    ],
  },
  [PlanType.ENTERPRISE]: {
    name: "Enterprise",
    price: 4299, // R$ 42,99
    serviceLimit: 50,
    highlightLimit: 15, // ENTERPRISE pode destacar 15 serviços
    highlightLevel: "enterprise",
    features: [
      "Até 50 serviços",
      "Destaque Enterprise em 15 serviços",
      "Analytics completo",
      "Gerente de conta dedicado",
    ],
  },
};
