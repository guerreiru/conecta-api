import { ServiceService } from "../../services/service.service";
import { AppDataSource } from "../../database";
import { Service } from "../../entities/Service";
import { User } from "../../entities/User";
import { Subscription } from "../../entities/Subscription";
import { Category } from "../../entities/Category";
import { PlanType, SubscriptionStatus } from "../../types/PlanType";

describe("ServiceService - Subscription Integration", () => {
  let serviceService: ServiceService;
  let mockServiceRepo: any;
  let mockUserRepo: any;
  let mockSubscriptionRepo: any;
  let mockCategoryRepo: any;

  beforeEach(() => {
    mockServiceRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn(),
      })),
    };

    mockUserRepo = {
      findOne: jest.fn(),
      findOneBy: jest.fn(),
    };

    mockSubscriptionRepo = {
      findOne: jest.fn(),
    };

    mockCategoryRepo = {
      findOneBy: jest.fn(),
    };

    (AppDataSource.getRepository as jest.Mock).mockImplementation((entity) => {
      if (entity === Service) return mockServiceRepo;
      if (entity === User) return mockUserRepo;
      if (entity === Subscription) return mockSubscriptionRepo;
      if (entity === Category) return mockCategoryRepo;
    });

    serviceService = new ServiceService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("create - Validação de limites por plano", () => {
    const mockCategory = { id: "cat-123", name: "Test Category" };
    const serviceData = {
      title: "Test Service",
      price: "100",
      categoryId: "cat-123",
      typeOfChange: "hora",
      userId: "user-123",
    };

    beforeEach(() => {
      mockCategoryRepo.findOneBy.mockResolvedValue(mockCategory);
    });

    it("deve permitir criar 1 serviço no plano FREE", async () => {
      const mockUser = {
        id: "user-123",
        hasActivePlan: false,
      };

      mockUserRepo.findOneBy.mockResolvedValue(mockUser);
      mockServiceRepo.count.mockResolvedValue(0);
      mockServiceRepo.create.mockReturnValue({ id: "service-123" });
      mockServiceRepo.save.mockResolvedValue({ id: "service-123" });

      const result = await serviceService.create(serviceData);

      expect(result).toBeDefined();
      expect(mockServiceRepo.save).toHaveBeenCalled();
    });

    it("deve bloquear criação do 2º serviço no plano FREE", async () => {
      const mockUser = {
        id: "user-123",
        hasActivePlan: false,
      };

      mockUserRepo.findOneBy.mockResolvedValue(mockUser);
      mockServiceRepo.count.mockResolvedValue(1); // Já tem 1 serviço

      await expect(serviceService.create(serviceData)).rejects.toThrow(
        "Limite de 1 serviço(s) atingido"
      );
    });

    it("deve permitir criar até 5 serviços no plano PLUS", async () => {
      const mockUser = {
        id: "user-123",
        hasActivePlan: true,
      };

      const mockSubscription = {
        plan: PlanType.PLUS,
        status: SubscriptionStatus.ACTIVE,
      };

      mockUserRepo.findOneBy.mockResolvedValue(mockUser);
      mockSubscriptionRepo.findOne.mockResolvedValue(mockSubscription);
      mockServiceRepo.count.mockResolvedValue(4); // Já tem 4 serviços
      mockServiceRepo.create.mockReturnValue({ id: "service-123" });
      mockServiceRepo.save.mockResolvedValue({ id: "service-123" });

      const result = await serviceService.create(serviceData);

      expect(result).toBeDefined();
    });

    it("deve bloquear criação do 6º serviço no plano PLUS", async () => {
      const mockUser = {
        id: "user-123",
        hasActivePlan: true,
      };

      const mockSubscription = {
        plan: PlanType.PLUS,
        status: SubscriptionStatus.ACTIVE,
      };

      mockUserRepo.findOneBy.mockResolvedValue(mockUser);
      mockSubscriptionRepo.findOne.mockResolvedValue(mockSubscription);
      mockServiceRepo.count.mockResolvedValue(5); // Já tem 5 serviços

      await expect(serviceService.create(serviceData)).rejects.toThrow(
        "Limite de 5 serviço(s) atingido"
      );
    });

    it("deve permitir criar até 15 serviços no plano PREMIUM", async () => {
      const mockUser = {
        id: "user-123",
        hasActivePlan: true,
      };

      const mockSubscription = {
        plan: PlanType.PREMIUM,
        status: SubscriptionStatus.ACTIVE,
      };

      mockUserRepo.findOneBy.mockResolvedValue(mockUser);
      mockSubscriptionRepo.findOne.mockResolvedValue(mockSubscription);
      mockServiceRepo.count.mockResolvedValue(14);
      mockServiceRepo.create.mockReturnValue({ id: "service-123" });
      mockServiceRepo.save.mockResolvedValue({ id: "service-123" });

      const result = await serviceService.create(serviceData);

      expect(result).toBeDefined();
    });

    it("deve permitir criar até 50 serviços no plano ENTERPRISE", async () => {
      const mockUser = {
        id: "user-123",
        hasActivePlan: true,
      };

      const mockSubscription = {
        plan: PlanType.ENTERPRISE,
        status: SubscriptionStatus.ACTIVE,
      };

      mockUserRepo.findOneBy.mockResolvedValue(mockUser);
      mockSubscriptionRepo.findOne.mockResolvedValue(mockSubscription);
      mockServiceRepo.count.mockResolvedValue(49);
      mockServiceRepo.create.mockReturnValue({ id: "service-123" });
      mockServiceRepo.save.mockResolvedValue({ id: "service-123" });

      const result = await serviceService.create(serviceData);

      expect(result).toBeDefined();
    });
  });

  describe("activateService", () => {
    it("deve ativar serviço inativo no plano PLUS", async () => {
      const mockService = {
        id: "service-123",
        isActive: false,
        user: { id: "user-123" },
      };

      const mockSubscription = {
        plan: PlanType.PLUS,
      };

      mockServiceRepo.findOne.mockResolvedValue(mockService);
      mockSubscriptionRepo.findOne.mockResolvedValue(mockSubscription);
      mockServiceRepo.count.mockResolvedValue(3); // 3 ativos de 5
      mockServiceRepo.save.mockResolvedValue({
        ...mockService,
        isActive: true,
      });

      const result = await serviceService.activateService(
        "service-123",
        "user-123"
      );

      expect(result.isActive).toBe(true);
    });

    it("deve bloquear ativação se limite do plano for atingido", async () => {
      const mockService = {
        id: "service-123",
        isActive: false,
        user: { id: "user-123" },
      };

      const mockSubscription = {
        plan: PlanType.PLUS,
      };

      mockServiceRepo.findOne.mockResolvedValue(mockService);
      mockSubscriptionRepo.findOne.mockResolvedValue(mockSubscription);
      mockServiceRepo.count.mockResolvedValue(5); // Já tem 5 ativos

      await expect(
        serviceService.activateService("service-123", "user-123")
      ).rejects.toThrow("Limite de 5 serviço(s) ativo(s) atingido");
    });

    it("deve bloquear ativação de serviço de outro usuário", async () => {
      const mockService = {
        id: "service-123",
        isActive: false,
        user: { id: "other-user" },
      };

      mockServiceRepo.findOne.mockResolvedValue(mockService);

      await expect(
        serviceService.activateService("service-123", "user-123")
      ).rejects.toThrow("Você não tem permissão para ativar este serviço");
    });
  });

  describe("deactivateService", () => {
    it("deve desativar serviço ativo", async () => {
      const mockService = {
        id: "service-123",
        isActive: true,
        user: { id: "user-123" },
      };

      mockServiceRepo.findOne.mockResolvedValue(mockService);
      mockServiceRepo.save.mockResolvedValue({
        ...mockService,
        isActive: false,
      });

      const result = await serviceService.deactivateService(
        "service-123",
        "user-123"
      );

      expect(result.isActive).toBe(false);
    });

    it("deve bloquear desativação de serviço já inativo", async () => {
      const mockService = {
        id: "service-123",
        isActive: false,
        user: { id: "user-123" },
      };

      mockServiceRepo.findOne.mockResolvedValue(mockService);

      await expect(
        serviceService.deactivateService("service-123", "user-123")
      ).rejects.toThrow("Este serviço já está inativo");
    });
  });
});
