import { Router } from "express";
import { authorization, isAuthenticated } from "../middleware/auth.middleware";
import DeliveryController from "../controller/delivery.controller";
const deliveryRouter=Router();
deliveryRouter.get("/mydeliveries",isAuthenticated,authorization(["delivery_boy"]),DeliveryController.getMyDeliveries);
deliveryRouter.post("/create-delivery-boy",isAuthenticated,DeliveryController.createDeliveryBoy);

export default deliveryRouter;
