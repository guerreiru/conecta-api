import { Router } from "express";
import { ReviewController } from "../controllers/review.controller";
import { authenticate } from "../middlewares/authenticate";

export const reviewRoutes = Router();

reviewRoutes.post("/", authenticate, ReviewController.createReview);
reviewRoutes.get("/service/:serviceId", ReviewController.getServiceReviews);
reviewRoutes.get(
  "/service/:serviceId/my-review",
  authenticate,
  ReviewController.getUserReview
);
reviewRoutes.get("/service/:serviceId/stats", ReviewController.getServiceStats);
reviewRoutes.put("/:reviewId", authenticate, ReviewController.updateReview);
reviewRoutes.delete("/:reviewId", authenticate, ReviewController.deleteReview);
