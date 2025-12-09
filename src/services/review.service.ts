import { AppDataSource } from "../database";
import { Review } from "../entities/Review";
import { Service } from "../entities/Service";
import { User } from "../entities/User";
import { HttpError } from "../utils/httpError";

type CreateReviewDTO = {
  serviceId: string;
  userId: string;
  rating: number;
  comment?: string;
};

type UpdateReviewDTO = {
  rating?: number;
  comment?: string;
};

type ReviewStats = {
  serviceId: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
};

export class ReviewService {
  private reviewRepository = AppDataSource.getRepository(Review);
  private serviceRepository = AppDataSource.getRepository(Service);
  private userRepository = AppDataSource.getRepository(User);

  async createReview({ serviceId, userId, rating, comment }: CreateReviewDTO) {
    if (rating === undefined || rating === null || rating < 1 || rating > 5) {
      throw new HttpError("Rating deve estar entre 1 e 5", 400);
    }

    if (comment !== undefined && comment !== null) {
      const trimmedComment = comment.trim();
      if (trimmedComment.length === 0) {
        comment = undefined;
      } else if (trimmedComment.length > 200) {
        throw new HttpError(
          "O comentário deve ter no máximo 200 caracteres",
          400
        );
      } else {
        comment = trimmedComment;
      }
    }

    const service = await this.serviceRepository.findOne({
      where: { id: serviceId },
      relations: ["user"],
    });

    if (!service) {
      throw new HttpError("Serviço não encontrado", 404);
    }

    const user = await this.userRepository.findOneBy({ id: userId });

    if (!user) {
      throw new HttpError("Usuário não encontrado", 404);
    }

    if (service.user.id === userId) {
      throw new HttpError("Você não pode avaliar seu próprio serviço", 403);
    }

    const existingReview = await this.reviewRepository.findOne({
      where: {
        service: { id: serviceId },
        user: { id: userId },
      },
    });

    if (existingReview) {
      throw new HttpError("Você já avaliou este serviço", 409);
    }

    const review = this.reviewRepository.create({
      rating,
      comment,
      service,
      user,
    });

    const savedReview = await this.reviewRepository.save(review);

    await this.updateServiceStats(serviceId);

    return savedReview;
  }

  async getServiceReviews(serviceId: string): Promise<Review[]> {
    const service = await this.serviceRepository.findOneBy({ id: serviceId });

    if (!service) {
      throw new HttpError("Serviço não encontrado", 404);
    }

    return await this.reviewRepository.find({
      where: { service: { id: serviceId } },
      relations: ["user"],
      order: { createdAt: "DESC" },
    });
  }

  async getUserReview(
    serviceId: string,
    userId: string
  ): Promise<Review | null> {
    const service = await this.serviceRepository.findOneBy({ id: serviceId });

    if (!service) {
      throw new HttpError("Serviço não encontrado", 404);
    }

    const review = await this.reviewRepository.findOne({
      where: {
        service: { id: serviceId },
        user: { id: userId },
      },
      relations: ["user"],
    });

    return review || null;
  }

  async updateReview(
    reviewId: string,
    userId: string,
    { rating, comment }: UpdateReviewDTO
  ) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId, user: { id: userId } },
      relations: ["user", "service"],
    });

    if (!review) {
      throw new HttpError("Avaliação não encontrada ou sem permissão", 404);
    }

    if (comment !== undefined) {
      const trimmedComment = comment ? String(comment).trim() : null;

      if (trimmedComment === null || trimmedComment.length === 0) {
        review.comment = null;
      } else if (trimmedComment.length > 200) {
        throw new HttpError(
          "O comentário deve ter no máximo 200 caracteres",
          400
        );
      } else {
        review.comment = trimmedComment;
      }
    }

    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        throw new HttpError("Rating deve estar entre 1 e 5", 400);
      }
      review.rating = rating;
    }

    const updatedReview = await this.reviewRepository.save(review);

    await this.updateServiceStats(review.service.id);

    if (updatedReview) {
      const { user: originalUser, ...reviewData } = updatedReview;
      const { refreshToken, password, ...safeUser } = originalUser;

      return {
        ...reviewData,
        user: safeUser,
        serviceId: reviewData.service.id,
      };
    }

    return null;
  }

  async deleteReview(reviewId: string, userId: string): Promise<void> {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ["user", "service"],
    });

    if (!review) {
      throw new HttpError("Avaliação não encontrada", 404);
    }

    if (review.user.id !== userId) {
      throw new HttpError("Você não pode deletar esta avaliação", 403);
    }

    const serviceId = review.service.id;

    await this.reviewRepository.delete(reviewId);

    await this.updateServiceStats(serviceId);
  }

  async getServiceStats(serviceId: string): Promise<ReviewStats> {
    const service = await this.serviceRepository.findOneBy({ id: serviceId });

    if (!service) {
      throw new HttpError("Serviço não encontrado", 404);
    }

    const reviews = await this.reviewRepository.find({
      where: { service: { id: serviceId } },
    });

    if (reviews.length === 0) {
      return {
        serviceId,
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution: {
          5: 0,
          4: 0,
          3: 0,
          2: 0,
          1: 0,
        },
      };
    }

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round((totalRating / reviews.length) * 10) / 10;

    const distribution = {
      5: reviews.filter((r) => r.rating === 5).length,
      4: reviews.filter((r) => r.rating === 4).length,
      3: reviews.filter((r) => r.rating === 3).length,
      2: reviews.filter((r) => r.rating === 2).length,
      1: reviews.filter((r) => r.rating === 1).length,
    };

    return {
      serviceId,
      averageRating,
      totalReviews: reviews.length,
      ratingDistribution: distribution,
    };
  }

  private async updateServiceStats(serviceId: string): Promise<void> {
    const reviews = await this.reviewRepository.find({
      where: { service: { id: serviceId } },
    });

    const totalReviews = reviews.length;
    const averageRating =
      totalReviews > 0
        ? Math.round(
            (reviews.reduce((sum, review) => sum + review.rating, 0) /
              totalReviews) *
              10
          ) / 10
        : 0;

    await this.serviceRepository.update(
      { id: serviceId },
      {
        averageRating,
        reviewCount: totalReviews,
      }
    );
  }
}
