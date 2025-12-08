import { Request, Response } from "express";
import { ReviewService } from "../services/review.service";
import { HttpError } from "../utils/httpError";
import { isUUID } from "class-validator";

const reviewService = new ReviewService();

export class ReviewController {
  static async createReview(req: Request, res: Response) {
    const { serviceId, rating, comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError("Usuário não autenticado", 401);
    }

    if (!serviceId || !isUUID(serviceId)) {
      throw new HttpError("serviceId inválido", 400);
    }

    if (!rating || !Number.isInteger(rating) || rating < 1 || rating > 5) {
      throw new HttpError("Rating deve ser um número inteiro entre 1 e 5", 400);
    }

    if (comment && comment.length > 200) {
      throw new HttpError(
        "O comentário deve ter no máximo 200 caracteres",
        400
      );
    }

    try {
      const review = await reviewService.createReview({
        serviceId,
        userId,
        rating,
        comment,
      });

      return res.status(201).json(review);
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      throw error;
    }
  }

  static async getServiceReviews(req: Request, res: Response) {
    const { serviceId } = req.params;

    if (!serviceId || !isUUID(serviceId)) {
      return res.status(400).json({ message: "serviceId inválido" });
    }

    try {
      const reviews = await reviewService.getServiceReviews(serviceId);
      return res.json(reviews);
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      throw error;
    }
  }

  static async getUserReview(req: Request, res: Response) {
    const { serviceId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError("Usuário não autenticado", 401);
    }

    if (!serviceId || !isUUID(serviceId)) {
      return res.status(400).json({ message: "serviceId inválido" });
    }

    try {
      const review = await reviewService.getUserReview(serviceId, userId);
      return res.json(review);
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      throw error;
    }
  }

  static async getServiceStats(req: Request, res: Response) {
    const { serviceId } = req.params;

    if (!serviceId || !isUUID(serviceId)) {
      return res.status(400).json({ message: "serviceId inválido" });
    }

    try {
      const stats = await reviewService.getServiceStats(serviceId);
      return res.json(stats);
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      throw error;
    }
  }

  static async updateReview(req: Request, res: Response) {
    const { reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError("Usuário não autenticado", 401);
    }

    if (!reviewId || !isUUID(reviewId)) {
      return res.status(400).json({ message: "reviewId inválido" });
    }

    if (
      rating !== undefined &&
      (!Number.isInteger(rating) || rating < 1 || rating > 5)
    ) {
      return res
        .status(400)
        .json({ message: "Rating deve ser um número inteiro entre 1 e 5" });
    }

    if (
      comment !== undefined &&
      (typeof comment !== "string" || comment.length > 200)
    ) {
      return res.status(400).json({
        message: "O comentário deve ter no máximo 200 caracteres",
      });
    }

    try {
      const review = await reviewService.updateReview(reviewId, userId, {
        rating,
        comment,
      });

      return res.json(review);
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      throw error;
    }
  }

  static async deleteReview(req: Request, res: Response) {
    const { reviewId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      throw new HttpError("Usuário não autenticado", 401);
    }

    if (!reviewId || !isUUID(reviewId)) {
      return res.status(400).json({ message: "reviewId inválido" });
    }

    try {
      await reviewService.deleteReview(reviewId, userId);
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof HttpError) {
        return res.status(error.statusCode).json({ message: error.message });
      }
      throw error;
    }
  }
}
