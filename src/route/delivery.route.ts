import { Router } from "express";
import { authorization, isAuthenticated } from "../middleware/auth.middleware";
import DeliveryController from "../controller/delivery.controller";
const deliveryRouter = Router();
deliveryRouter.get(
  "/mydeliveries",
  isAuthenticated,
  authorization(["delivery_boy"]),
  DeliveryController.getMyDeliveries
);
deliveryRouter.post(
  "/create-delivery-boy",
  isAuthenticated,
  DeliveryController.createDeliveryBoy
);
deliveryRouter.get(
  "/weekly-deliveries",
  isAuthenticated,
  authorization(["delivery_boy"]),
  DeliveryController.getWeeklyDeliveries
);
deliveryRouter.get(
  "/on-time-rating",
  isAuthenticated,
  authorization(["delivery_boy"]),
  DeliveryController.calculateDeliveryPerformance
);
deliveryRouter.post(
  "/rate/:deliveryBoyId",
  isAuthenticated,
  DeliveryController.AddRating
);
deliveryRouter.get(
  "/ratings",
  isAuthenticated,
  DeliveryController.getdeliveryboyRatings
);
deliveryRouter.get(
  "/earnings",
  isAuthenticated,
  DeliveryController.getDeliveryEarnings
);
export default deliveryRouter;
