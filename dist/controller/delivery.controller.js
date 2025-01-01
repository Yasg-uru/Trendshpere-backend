"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const usermodel_1 = __importDefault(require("../model/usermodel"));
const Errorhandler_util_1 = __importDefault(require("../util/Errorhandler.util"));
const order_model_1 = __importDefault(require("../model/order.model"));
function getStartOfWeek(date) {
    const startOfWeek = new Date(date);
    startOfWeek.setHours(0, 0, 0, 0); // Set time to 00:00:00
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Adjust to the start of the week (Sunday)
    return startOfWeek;
}
const calculatePercentage = (part, total) => {
    return total === 0 ? 0 : (part / total) * 100;
};
class DeliveryController {
    static getMyDeliveries(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
                const DeliverBoy = yield usermodel_1.default.findById(userId);
                if (!DeliverBoy) {
                    return next(new Errorhandler_util_1.default(404, "User not found"));
                }
                const orderCounts = yield order_model_1.default.aggregate([
                    {
                        $match: {
                            $and: [
                                { "address.city": (_b = DeliverBoy.deliveryArea) === null || _b === void 0 ? void 0 : _b.city },
                                { "address.state": (_c = DeliverBoy.deliveryArea) === null || _c === void 0 ? void 0 : _c.state },
                                { "address.postalCode": (_d = DeliverBoy.deliveryArea) === null || _d === void 0 ? void 0 : _d.postalCode },
                                { "address.country": (_e = DeliverBoy.deliveryArea) === null || _e === void 0 ? void 0 : _e.country },
                            ],
                        },
                    },
                    {
                        $group: {
                            _id: "$orderStatus",
                            count: { $sum: 1 },
                        },
                    },
                ]);
                const deliveryCounts = {
                    completed: 0,
                    pending: 0,
                };
                orderCounts.forEach((order) => {
                    if (order._id === "delivered") {
                        deliveryCounts.completed = order.count;
                    }
                    else if (order._id === "pending") {
                        deliveryCounts.pending = order.count;
                    }
                });
                const pendingOrders = yield order_model_1.default.find({
                    "address.city": (_f = DeliverBoy.deliveryArea) === null || _f === void 0 ? void 0 : _f.city,
                    "address.state": (_g = DeliverBoy.deliveryArea) === null || _g === void 0 ? void 0 : _g.state,
                    "address.postalCode": (_h = DeliverBoy.deliveryArea) === null || _h === void 0 ? void 0 : _h.postalCode,
                    "address.country": (_j = DeliverBoy.deliveryArea) === null || _j === void 0 ? void 0 : _j.country,
                    orderStatus: "pending",
                });
                // Send the response
                return res.status(200).json({
                    deliveryData: {
                        deliveryCounts,
                        pendingOrders,
                    },
                });
            }
            catch (error) {
                return next(new Errorhandler_util_1.default(500, "Internal server error"));
            }
        });
    }
    static createDeliveryBoy(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { userId, vehicleDetails, deliveryArea, status } = req.body;
                const user = yield usermodel_1.default.findById(userId);
                if (!user) {
                    return next(new Errorhandler_util_1.default(404, "User not found "));
                }
                user.vehicleDetails = vehicleDetails;
                user.deliveryArea = deliveryArea;
                user.status = status;
                user.Role = "delivery_boy";
                yield user.save();
                res.status(200).json({
                    message: "Created delivery boy successfully",
                });
            }
            catch (error) {
                console.log("this is a error ", error);
                next(error);
            }
        });
    }
    static getWeeklyDeliveries(req, // Ensure reqwithuser includes user details, like deliveryBoyId
    res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const clonedDate = new Date();
                const dayOfWeek = clonedDate.getDay();
                const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                clonedDate.setDate(clonedDate.getDate() - diff);
                clonedDate.setHours(0, 0, 0, 0);
                const startOfWeek = clonedDate;
                console.log("this is a start of the week :", startOfWeek);
                const deliveryBoyId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id; // Fetch deliveryBoyId from params (or req.query)
                // MongoDB aggregation pipeline
                const deliveries = yield order_model_1.default.aggregate([
                    // Match orders where the product was delivered in the current week and by the specific delivery boy
                    {
                        $match: {
                            orderStatus: "delivered", // Only count delivered orders
                            updatedAt: { $gte: startOfWeek }, // Only count deliveries within the current week
                            deliveryBoyId: deliveryBoyId,
                        },
                    },
                    // Project to include day of the week
                    {
                        $project: {
                            dayOfWeek: { $dayOfWeek: "$updatedAt" }, // Get day of the week (1=Sunday, 2=Monday, ..., 7=Saturday)
                        },
                    },
                    // Group by day of the week and count the number of deliveries
                    {
                        $group: {
                            _id: "$dayOfWeek", // Group by day of the week
                            totalDeliveries: { $sum: 1 }, // Count total deliveries for each day
                        },
                    },
                    // Sort by day of the week (1 to 7)
                    { $sort: { _id: 1 } },
                ]);
                // Prepare data to match the format of deliveryData
                const deliveryCounts = new Array(7).fill(0); // Initialize array with 0s for each day of the week
                deliveries.forEach((delivery) => {
                    // delivery._id is the day of the week (1-7)
                    deliveryCounts[delivery._id - 1] = delivery.totalDeliveries; // Map delivery count to the correct day (0-6)
                });
                // Return the weekly delivery data in the desired format
                return res.status(200).json({
                    success: true,
                    weeklyData: {
                        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                        datasets: [
                            {
                                label: "Deliveries Completed",
                                data: deliveryCounts,
                                backgroundColor: "rgba(75, 192, 192, 0.6)",
                                borderColor: "rgba(75, 192, 192, 1)",
                                borderWidth: 1,
                            },
                        ],
                    },
                });
            }
            catch (error) {
                console.error(error);
                return res.status(500).json({
                    success: false,
                    message: "Failed to fetch weekly deliveries",
                });
            }
        });
    }
    static calculateDeliveryPerformance(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const deliveryBoyId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
                const currentDate = new Date();
                const lastweek = new Date(currentDate.getTime() - 7);
                const TotalOrders = yield order_model_1.default.find({
                    deliveryBoyId: deliveryBoyId,
                    orderStatus: "delivered",
                });
                const totalDeliveries = TotalOrders.length;
                const OntimeDeliveries = TotalOrders.filter((order) => order.isDeliveredOnTime).length;
                const onTimePercentage = calculatePercentage(OntimeDeliveries, totalDeliveries);
                const lastweekOrders = yield order_model_1.default.find({
                    orderStatus: "delivered",
                    deliveryBoyId,
                    deliveryTime: { $gte: lastweek, $lte: currentDate },
                });
                const lastWeekOntimeDeliveries = lastweekOrders.filter((order) => order.isDeliveredOnTime).length;
                const lastweekpercentage = calculatePercentage(lastWeekOntimeDeliveries, lastweekOrders.length);
                const performanceDifference = onTimePercentage - lastweekpercentage;
                res.status(200).json({
                    data: {
                        totalDeliveries,
                        OntimeDeliveries,
                        onTimePercentage,
                        lastweekpercentage,
                        performanceDifference: performanceDifference.toFixed(2),
                        message: performanceDifference > 0
                            ? `+${performanceDifference.toFixed(2)}% from last week`
                            : performanceDifference < 0
                                ? `-${Math.abs(performanceDifference).toFixed(2)}% from last week`
                                : "",
                    },
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    static AddRating(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
                const { deliveryBoyId } = req.params;
                const { rating } = req.body;
                const deliveryBoy = yield usermodel_1.default.findById(deliveryBoyId);
                if (!deliveryBoy) {
                    return next(new Errorhandler_util_1.default(404, "Delivery boy not found "));
                }
                if (deliveryBoy.deliveryBoyRatings.rateBy.includes(userId)) {
                    return next(new Errorhandler_util_1.default(404, "Already you rated "));
                }
                deliveryBoy.deliveryBoyRatings.ratings =
                    deliveryBoy.deliveryBoyRatings.ratings *
                        (deliveryBoy.deliveryBoyRatings.totalRatings - 1) +
                        rating;
                deliveryBoy.deliveryBoyRatings.totalRatings += 1;
                deliveryBoy.deliveryBoyRatings.rateBy.push(userId);
                yield deliveryBoy.save();
                res.status(200).json({
                    message: "successfully added your ratings ",
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    static getdeliveryboyRatings(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
                const deliveryBoy = yield usermodel_1.default.findById(userId);
                if (!deliveryBoy) {
                    return next(new Errorhandler_util_1.default(404, "delivery boy not found"));
                }
                res.status(200).json({
                    ratings: {
                        averageRating: deliveryBoy.deliveryBoyRatings.ratings,
                        totalReviews: deliveryBoy.deliveryBoyRatings.totalRatings,
                    },
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    static getDeliveryEarnings(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
                const deliveryBoy = yield usermodel_1.default
                    .findById(userId)
                    .select("DeliveryBoyEarnings");
                if (!deliveryBoy) {
                    return next(new Errorhandler_util_1.default(404, "User not found "));
                }
                const Earnings = deliveryBoy.DeliveryBoyEarnings;
                const yesterDay = new Date();
                yesterDay.setDate(yesterDay.getDate() - 1);
                const yesterdayEarnings = Earnings.earningHistory
                    .filter((earning) => earning.date >= yesterDay)
                    .reduce((acc, earning) => acc + earning.amount, 0);
                const difference = yesterdayEarnings.toFixed(2);
                res.status(200).json({
                    DeliveryEarnings: {
                        TotalEarnings: Earnings.totalEarnings.toFixed(2),
                        yesterdayEarnings: difference,
                    },
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.default = DeliveryController;
