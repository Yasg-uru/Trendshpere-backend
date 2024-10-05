"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const delivery_controller_1 = __importDefault(require("../controller/delivery.controller"));
const deliveryRouter = (0, express_1.Router)();
deliveryRouter.get("/mydeliveries", auth_middleware_1.isAuthenticated, (0, auth_middleware_1.authorization)(["delivery_boy"]), delivery_controller_1.default.getMyDeliveries);
deliveryRouter.post("/create-delivery-boy", auth_middleware_1.isAuthenticated, delivery_controller_1.default.createDeliveryBoy);
deliveryRouter.get("/weekly-deliveries", auth_middleware_1.isAuthenticated, (0, auth_middleware_1.authorization)(["delivery_boy"]), delivery_controller_1.default.getWeeklyDeliveries);
deliveryRouter.get("/on-time-rating", auth_middleware_1.isAuthenticated, (0, auth_middleware_1.authorization)(["delivery_boy"]), delivery_controller_1.default.calculateDeliveryPerformance);
deliveryRouter.post("/rate/:deliveryBoyId", auth_middleware_1.isAuthenticated, delivery_controller_1.default.AddRating);
deliveryRouter.get("/ratings", auth_middleware_1.isAuthenticated, delivery_controller_1.default.getdeliveryboyRatings);
deliveryRouter.get("/earnings", auth_middleware_1.isAuthenticated, delivery_controller_1.default.getDeliveryEarnings);
exports.default = deliveryRouter;
