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
exports.GetSingleOrder = exports.FilterOrdersForAdmin = exports.processReturnedItems = exports.updateOrderStatus = exports.searchOrders = exports.FilterOrders = exports.returnPolicy = exports.processReplacement = exports.replacePolicy = exports.refundPayment = exports.cancelOrder = exports.VerifyPayment = exports.createOrder = void 0;
const Errorhandler_util_1 = __importDefault(require("../util/Errorhandler.util"));
const crypto_1 = __importDefault(require("crypto"));
const __1 = require("..");
const order_model_1 = __importDefault(require("../model/order.model"));
const razorpay_1 = __importDefault(require("razorpay"));
const product_model_1 = require("../model/product.model");
const usermodel_1 = __importDefault(require("../model/usermodel"));
// const razorpay = new Razorpay({
//   key_id: "rzp_live_tK7jKIBkQuTeH7",
//   key_secret: "d3q0tkLxfFVKoizPqeboYYsm",
// });
const razorpay = new razorpay_1.default({
    key_id: "rzp_test_7dU2Zk3usqjmRX",
    key_secret: "AtoGFb47DrDC0hdZfXR9dnCi",
});
const calculateDiscountPrice = (couponCode, products) => {
    let discountPercentage = 0;
    if (couponCode === "SPRING2024") {
        discountPercentage = 0.1;
    }
    return products.map((product) => {
        const discountByCoupon = (discountPercentage / 100) * product.priceAtPurchase;
        return Object.assign(Object.assign({}, product), { discountByCoupon });
    });
};
const calculateEarnings = (totalAmount, isOntime) => {
    if (isOntime) {
        return totalAmount * 0.06;
    }
    else {
        return totalAmount * 0.03;
    }
};
const createOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // const user = "66e0139e7f59c516d80a3283";
        const user = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { products, address, couponCode, loyaltyPointsUsed, isGiftOrder, deliveryType, giftMessage, } = req.body;
        console.log("this is a req.body of the create order :", req.body);
        let deliveryCharge = 0;
        if (deliveryType === "express") {
            deliveryCharge = 10;
        }
        // if (couponCode !== "SPRING2024") {
        //   return next(new Errorhandler(400, "Please Enter Correct Coupon Code"));
        // }
        const updatedproducts = calculateDiscountPrice(couponCode, products);
        let totalAmount = 0;
        let discountAmount = 0;
        const productWithPolicies = yield Promise.all(updatedproducts.map((product) => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const productDetails = yield product_model_1.Product.findById(product.productId);
            return Object.assign(Object.assign({}, product), { isReturnable: ((_a = productDetails === null || productDetails === void 0 ? void 0 : productDetails.returnPolicy) === null || _a === void 0 ? void 0 : _a.eligible) || false, isReplaceable: ((_b = productDetails === null || productDetails === void 0 ? void 0 : productDetails.replcementPolicy) === null || _b === void 0 ? void 0 : _b.elgible) || false });
        })));
        productWithPolicies.forEach((product) => {
            totalAmount += product.priceAtPurchase * product.quantity;
            discountAmount += product.discount * product.quantity;
        });
        let loyaltyDiscount = 0;
        if (loyaltyPointsUsed > 0) {
            loyaltyDiscount = Math.floor(loyaltyPointsUsed / 10); // 10 loyalty points = 1 rupee
        }
        // const taxRate = 0.1;
        const taxAmount = totalAmount;
        // const taxAmount = totalAmount * taxRate;
        const finalAmount = Math.floor(totalAmount - discountAmount - loyaltyDiscount + deliveryCharge);
        const razorpayOrder = yield razorpay.orders.create({
            amount: parseInt(finalAmount.toString()) * 100,
            currency: "INR",
            receipt: `receipt_${Date.now()}`,
            payment_capture: true,
        });
        const currentDate = new Date();
        let expectedDeliveryTime;
        if (deliveryType === "express") {
            expectedDeliveryTime = new Date(currentDate);
            expectedDeliveryTime.setDate(currentDate.getDate() + 2); // For express delivery (e.g., 2 days)
        }
        else {
            expectedDeliveryTime = new Date(currentDate);
            expectedDeliveryTime.setDate(currentDate.getDate() + 5); // For standard delivery (e.g., 5 days)
        }
        const newOrder = new order_model_1.default({
            user,
            products: productWithPolicies.map((product) => ({
                productId: product.productId,
                variantId: product.variantId,
                quantity: product.quantity,
                size: product.size,
                priceAtPurchase: product.priceAtPurchase,
                discount: product.discount,
                discountByCoupon: product.discountByCoupon,
                isReturnable: product.isReturnable,
                isReplaceable: product.isReplaceable,
            })),
            totalAmount,
            discountAmount,
            couponCode,
            taxAmount,
            finalAmount,
            address,
            payment: {
                paymentId: razorpayOrder.id, // Razorpay order ID
                provider: "Razorpay", // Payment provider is Razorpay
                paymentMethod: "pending", // Payment method will be set after user payment
                paymentStatus: "pending", // Status is pending until the payment is confirmed
            },
            orderStatus: "pending",
            loyaltyPointsUsed,
            isGiftOrder,
            expectedDeliveryTime,
            giftMessage,
            auditLog: [
                {
                    action: "order_created",
                    actor: user,
                    timestamp: new Date(),
                    description: "Order created successfully.",
                },
            ],
        });
        const Existinguser = yield usermodel_1.default.findById(user);
        if (Existinguser) {
            const isExistingAddress = Existinguser.address.some((add) => address.addressLine1 === add.addressLine1 &&
                address.addressLine2 === add.addressLine2 &&
                address.city === add.city &&
                address.state === add.state &&
                address.postalCode === add.postalCode &&
                address.country === add.country &&
                address.country === add.country &&
                address.phone === add.phone &&
                address.type === add.type);
            if (!isExistingAddress) {
                Existinguser.address.push(address);
                yield Existinguser.save();
            }
        }
        yield newOrder.save();
        // **Step 3: Respond with Razorpay order details**
        res.status(201).json({
            success: true,
            message: "Order created successfully. Proceed with payment.",
            order: newOrder,
            razorpayOrder,
        });
    }
    catch (error) {
        console.log("ths is a error message ,", error);
        next(error);
    }
});
exports.createOrder = createOrder;
const VerifyPayment = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const generatedSignature = crypto_1.default
            .createHmac("sha256", "AtoGFb47DrDC0hdZfXR9dnCi") // Replace this with your Razorpay secret key
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest("hex");
        console.log("this is a generated signature :", generatedSignature);
        if (razorpay_signature !== generatedSignature) {
            return next(new Errorhandler_util_1.default(400, "Payment verification failed. Invalid signature."));
        }
        const order = yield order_model_1.default.findOne({
            "payment.paymentId": razorpay_order_id,
        });
        const user = yield usermodel_1.default.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
        if (!user) {
            return next(new Errorhandler_util_1.default(404, "User not found "));
        }
        if (!order) {
            return next(new Errorhandler_util_1.default(404, "Order not found "));
        }
        order.payment.paymentStatus = "completed";
        order.payment.paymentDate = new Date();
        order.payment.paymentMethod = "Razorpay";
        order.orderStatus = "processing";
        if (order.loyaltyPointsUsed) {
            user.loyaltyPoints -= order.loyaltyPointsUsed;
            yield user.save();
        }
        order.auditLog.push({
            action: "payment_verified",
            actor: order.user,
            timestamp: new Date(),
            description: "Payment successfully verified.",
        });
        const paymentGatewayResponse = yield razorpay.payments.fetch(razorpay_payment_id);
        // Step 5: Handle payment status
        if (paymentGatewayResponse.status === "captured") {
            // Payment successful
            order.payment.paymentStatus = "completed";
            order.payment.paymentId = paymentGatewayResponse.id;
            order.payment.paymentDate = new Date();
            order.orderStatus = "processing";
        }
        else if (paymentGatewayResponse.status === "failed") {
            // Payment failed (insufficient funds, etc.)
            order.payment.paymentStatus = "failed";
            order.orderStatus = "cancelled";
        }
        order.save();
        yield Promise.all(order.products.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            const product = yield product_model_1.Product.findById(item.productId);
            if (product) {
                user.loyaltyPoints += product.loyalityPoints * item.quantity;
                const variant = product.variants.find((variant) => variant._id.toString() === item.variantId.toString());
                if (variant) {
                    console.log("this is a variant before updation of the stock:", variant);
                    variant.stock -= item.quantity;
                    const size = variant.size.find((s) => s.size.toString() === item.size.toString());
                    if (size) {
                        size.stock -= item.quantity;
                    }
                    yield product.save();
                    console.log("this is a variant after stock updation :", variant);
                    const productID = product._id;
                    __1.io.emit("stock-updated", { productID, variantID: variant._id });
                }
            }
        })));
        yield user.save();
        res.status(200).json({
            success: true,
            message: "Payment successfully verified and order updated.",
            order,
        });
    }
    catch (error) {
        return next(new Errorhandler_util_1.default(500, "An Error occured while verifying payment"));
    }
});
exports.VerifyPayment = VerifyPayment;
const cancelOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { OrderId, cancelReason } = req.body;
        // console.log("this is a order cancel controller :", req.body);
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const order = yield order_model_1.default.findById(OrderId).populate("products.productId");
        if (!order) {
            return next(new Errorhandler_util_1.default(404, "Order not found "));
        }
        // if (order.user.toString() !== userId.toString()) {
        //   return next(new Errorhandler(400, "Unauthorized Access"));
        // }
        if (order.orderStatus === "shipped" || order.orderStatus === "delivered") {
            return next(new Errorhandler_util_1.default(400, "Order cannot be canceled after shipping or delivery"));
        }
        order.orderStatus = "cancelled";
        order.cancelReason = cancelReason;
        order.cancellationDate = new Date();
        yield Promise.all(order.products.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            const product = yield product_model_1.Product.findById(item.productId);
            if (product) {
                const variant = product.variants.find((variant) => variant._id.toString() === item.variantId.toString());
                if (variant) {
                    variant.stock += item.quantity;
                    yield product.save();
                }
            }
        })));
        if (order.payment.paymentStatus === "completed") {
            const refund = yield (0, exports.refundPayment)(order.payment.paymentId, order.finalAmount);
            console.log("this is a refund data :", refund.data);
            if (!refund.success) {
                return next(new Errorhandler_util_1.default(400, "Refund Failed"));
            }
            order.payment.paymentStatus = "refunded";
            // order.refund = {
            //   requested: true,
            //   amount: order.totalAmount,
            //   status: "completed",
            //   requestDate: new Date(),
            //   completionDate: new Date(),
            // };
            order.auditLog.push({
                action: "order_cancelled",
                actor: order.user, // Assuming `userId` holds the ID of the user performing the action
                timestamp: new Date(),
                description: "Order has been cancelled due to the following reason: " +
                    cancelReason,
            });
            yield order.save();
        }
        res.status(200).json({
            message: "Order Cancelled Successfully",
            order,
        });
    }
    catch (error) {
        console.log("this is a error :", error);
        next(error);
    }
});
exports.cancelOrder = cancelOrder;
const refundPayment = (paymentId, TotalAmount) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const refund = yield razorpay.payments.refund(paymentId, {
            amount: TotalAmount * 100, // Razorpay accepts amount in paise (1 INR = 100 paise)
            speed: "normal", // Optional, can be "fast" or "normal"
            notes: {
                reason: "Order cancellation refund",
            },
        });
        return {
            success: true,
            data: refund,
        };
    }
    catch (error) {
        console.log("Razorpay Error in refund:", error);
        return {
            success: false,
            error: error,
        };
    }
});
exports.refundPayment = refundPayment;
const replacePolicy = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId, replaceItems, reason } = req.body;
        console.log("this is a replacement items req.body for testing :", req.body);
        // Fetch the order by ID
        const order = yield order_model_1.default.findById(orderId);
        if (!order) {
            return next(new Errorhandler_util_1.default(404, "Order not found"));
        }
        if (order.orderStatus === "delivered" ||
            order.orderStatus === "replaced" ||
            order.orderStatus === "returned" ||
            order.orderStatus === "cancelled") {
            return next(new Errorhandler_util_1.default(401, `You can't able to replace this order becaused this order is already ${order.orderStatus}`));
        }
        // Process each item in replaceItems array
        yield Promise.all(replaceItems.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const product = yield product_model_1.Product.findById(item.productId);
                if (!product) {
                    // Use `next` to handle the error within an async function
                    return next(new Errorhandler_util_1.default(404, `Product with ID ${item.productId} not found`));
                }
                // Check if the product is eligible for replacement
                if (product.replcementPolicy.elgible) {
                    const currentDate = new Date();
                    const purchaseDate = new Date(order.createdAt);
                    const replaceDaysAllowed = product.replcementPolicy.replacementDays;
                    const timeDifference = currentDate.getTime() - purchaseDate.getTime();
                    const daysSincePurchase = timeDifference / (1000 * 3600 * 24);
                    // Ensure the replacement period is still valid
                    if (daysSincePurchase <= replaceDaysAllowed) {
                        // Find the ordered product by productId and variantId
                        const orderProduct = order.products.find((prod) => prod.productId.toString() === item.productId.toString() &&
                            prod.variantId.toString() === item.variantId.toString());
                        if (!orderProduct) {
                            return next(new Errorhandler_util_1.default(404, `Ordered product with variant ID ${item.variantId} not found`));
                        }
                        // Mark the product as requested for replacement
                        orderProduct.replacement = {
                            requested: true,
                            status: "pending",
                            reason,
                            requestDate: new Date(),
                        };
                    }
                    else {
                        // Handle cases where the replacement period has passed
                        return next(new Errorhandler_util_1.default(400, `Replacement period exceeded for product ID ${item.productId}`));
                    }
                }
                else {
                    // Handle cases where the product is not eligible for replacement
                    return next(new Errorhandler_util_1.default(400, `Product with ID ${item.productId} is not eligible for replacement`));
                }
            }
            catch (error) {
                console.error("Error processing replacement for item:", error);
                return next(new Errorhandler_util_1.default(500, "Internal server error"));
            }
        })));
        // Audit log for replacement request
        order.auditLog.push({
            action: "replacement_requested",
            actor: order.user,
            timestamp: new Date(),
            description: `Replacement requested for some items.`,
        });
        order.orderStatus = "replaced";
        // Save the updated order
        yield order.save();
        // Success response
        res.status(200).json({
            success: true,
            message: "Replacement request initiated successfully",
            order,
        });
    }
    catch (error) {
        console.error("Error occurred while processing replacement:", error);
        next(new Errorhandler_util_1.default(500, "An error occurred while processing the replacement"));
    }
});
exports.replacePolicy = replacePolicy;
const processReplacement = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { replacementItems, orderId, status } = req.body;
        console.log("this a req.body :", req.body);
        const order = yield order_model_1.default.findById(orderId);
        if (!order) {
            return next(new Errorhandler_util_1.default(404, "Order not found "));
        }
        console.log("this a order that is finded by the  :", order);
        //after finding the order we need to preform the operations
        yield Promise.all(replacementItems.map((item) => {
            var _a, _b;
            const orderProduct = order.products.find((product) => product.productId.toString() === item.productId.toString() &&
                product.variantId.toString() === item.variantId.toString());
            if (!orderProduct) {
                return next(new Errorhandler_util_1.default(404, `Product with ID ${item.productId} not found in the order`));
            }
            if (status === "rejected") {
                if (((_a = orderProduct.replacement) === null || _a === void 0 ? void 0 : _a.status) === "pending") {
                    orderProduct.replacement.status = "rejected";
                    orderProduct.replacement.responseDate = new Date();
                }
                else {
                    return next(new Errorhandler_util_1.default(400, "Replacement request not in a valid state to be rejected"));
                }
            }
            if (status === "approved") {
                if (((_b = orderProduct.replacement) === null || _b === void 0 ? void 0 : _b.status) === "pending") {
                    // Mark the replacement request as approved
                    orderProduct.replacement.status = "approved";
                    orderProduct.replacement.responseDate = new Date();
                    // Optionally: Add logic to handle product return from the customer and product replacement shipping
                }
                else {
                    return next(new Errorhandler_util_1.default(400, "Replacement request not in a valid state to be approved"));
                }
            }
        }));
        order.auditLog.push({
            action: "replacement_status_updated",
            actor: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id, // Assuming req.user contains the authenticated user making the change (admin or delivery personnel)
            timestamp: new Date(),
            description: `Replacement ${status} for order ${orderId}`,
        });
        yield order.save();
        res.status(200).json({
            success: true,
            message: `Replacement request(s) ${status} successfully`,
            order,
        });
    }
    catch (error) {
        next(new Errorhandler_util_1.default(500, "An error occurred while processing the replacement"));
    }
});
exports.processReplacement = processReplacement;
const returnPolicy = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId, returnItems } = req.body;
        // Find the order by ID
        const order = yield order_model_1.default.findById(orderId);
        if (!order) {
            return next(new Errorhandler_util_1.default(404, "Order not found"));
        }
        console.log("Return items:", returnItems);
        // Initialize refund details
        let totalRefundAmount = 0;
        // Process each return item
        yield Promise.all(returnItems.map((item) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const product = yield product_model_1.Product.findById(item.productId);
                if (!product) {
                    throw new Errorhandler_util_1.default(404, `Product with ID ${item.productId} not found`);
                }
                if (product.returnPolicy.eligible) {
                    const currentDate = new Date();
                    const purchasedDate = new Date(order.createdAt);
                    const refundDaysAllowed = product.returnPolicy.refundDays;
                    const timeDifference = currentDate.getTime() - purchasedDate.getTime();
                    const daysSincePurchase = timeDifference / (1000 * 3600 * 24);
                    if (daysSincePurchase <= refundDaysAllowed) {
                        const variant = product.variants.find((variant) => variant._id.toString() === item.variantId.toString());
                        if (!variant) {
                            throw new Errorhandler_util_1.default(404, `Variant with ID ${item.variantId} not found`);
                        }
                        // Calculate refund amount
                        const calculatedRefund = item.priceAtPurchase - item.discount - item.discountByCoupon;
                        if (calculatedRefund > 0) {
                            totalRefundAmount += calculatedRefund * item.quantity;
                            // Update the refund field in the products array of the order
                            const orderProduct = order.products.find((prod) => prod.productId.toString() === item.productId.toString() &&
                                prod.variantId.toString() === item.variantId.toString());
                            if (orderProduct) {
                                orderProduct.refund = {
                                    requested: true,
                                    amount: totalRefundAmount,
                                    status: "pending",
                                    requestDate: new Date(),
                                };
                            }
                        }
                        else {
                            throw new Errorhandler_util_1.default(400, "Invalid calculated refund amount for item");
                        }
                    }
                    else {
                        throw new Errorhandler_util_1.default(400, "Refund period exceeded for item");
                    }
                }
                else {
                    throw new Errorhandler_util_1.default(400, `Item with ID ${item.productId} is not eligible for return`);
                }
            }
            catch (error) {
                return next(error);
            }
        })));
        console.log("Total refund amount:", totalRefundAmount);
        // Update order audit log
        order.auditLog.push({
            action: "return_requested",
            actor: order.user,
            timestamp: new Date(),
            description: `Refund of ₹${totalRefundAmount} requested for returned items.`,
        });
        order.orderStatus = "return_requested";
        // Save the updated order with refund status
        yield order.save();
        // Return success response
        res.status(200).json({
            success: true,
            message: "Return processed successfully. Refund request has been initiated.",
            refundAmount: totalRefundAmount,
            order,
        });
    }
    catch (error) {
        console.log("Error occurred during return process:", error);
        next(new Errorhandler_util_1.default(500, "An error occurred while processing the return policy"));
    }
});
exports.returnPolicy = returnPolicy;
const FilterOrders = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        // Extract filters from query parameters
        const { orderStatus, // Order status
        productId, // Product ID
        variantId, // Product Variant ID
        paymentStatus, // Payment status
        startDate, // For date range filtering
        endDate, couponCode, // Coupon used
        isGiftOrder, // If it's a gift order
        city, // Address city
        country, // Address country
        minTotalAmount, // Minimum order amount
        maxTotalAmount, // Maximum order amount
        page = 1, // Pagination: default page 1
        limit = 10, // Pagination: default limit of 10
        sortBy = "createdAt", // Sorting field (default: createdAt)
        order = "desc", // Sorting order (default: descending)
         } = req.query;
        // console.log("this is a req.query:", req.query);
        // Initialize query object for MongoDB
        const query = {};
        const user = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        // Add search conditions dynamically based on query params
        if (user)
            query.user = user;
        if (orderStatus)
            query.orderStatus = { $in: orderStatus };
        if (productId)
            query["products.productId"] = productId;
        if (variantId)
            query["products.variantId"] = variantId;
        if (paymentStatus)
            query["payment.paymentStatus"] = paymentStatus;
        if (couponCode)
            query.couponCode = couponCode;
        if (isGiftOrder)
            query.isGiftOrder = isGiftOrder === "true"; // Convert string to boolean
        if (city)
            query["address.city"] = city;
        if (country)
            query["address.country"] = country;
        // Date range filter
        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate)
                query.createdAt.$gte = new Date(startDate);
            if (endDate)
                query.createdAt.$lte = new Date(endDate);
        }
        // Total amount range filter
        if (minTotalAmount || maxTotalAmount) {
            query.totalAmount = {};
            if (minTotalAmount)
                query.totalAmount.$gte = Number(minTotalAmount);
            if (maxTotalAmount)
                query.totalAmount.$lte = Number(maxTotalAmount);
        }
        // Pagination and sorting
        const skip = (Number(page) - 1) * Number(limit);
        const sortOptions = {};
        sortOptions[sortBy] = order === "asc" ? 1 : -1;
        // Execute the search query with pagination and sorting
        const orders = yield order_model_1.default.find(query)
            .skip(skip)
            .limit(Number(limit))
            .sort(sortOptions)
            .populate("products.productId");
        // Count total matching documents (without pagination)
        const totalOrders = yield order_model_1.default.countDocuments(query);
        // Calculate total pages and pagination flags
        const totalPages = Math.ceil(totalOrders / Number(limit));
        const currentPage = Number(page);
        const hasNextPage = currentPage < totalPages;
        const hasPrevPage = currentPage > 1;
        // console.log("this is a orders :", orders);
        // Send response with pagination data
        res.status(200).json({
            success: true,
            orders,
            pagination: {
                totalOrders,
                currentPage,
                totalPages,
                limit: Number(limit),
                hasNextPage,
                hasPrevPage,
            },
        });
    }
    catch (error) {
        next(new Error("Error fetching orders"));
    }
});
exports.FilterOrders = FilterOrders;
const searchOrders = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { searchQuery } = req.query;
        if (!searchQuery) {
            return next(new Errorhandler_util_1.default(404, "Please enter a query for search"));
        }
        const user = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        // Create a regex for case-insensitive searching
        const regex = new RegExp(searchQuery, "i"); // 'i' for case-insensitivity
        // Use $or to search across multiple fields
        const orders = yield order_model_1.default.find({
            user,
            $or: [
                { "address.street": regex },
                { "address.city": regex },
                { "address.state": regex },
                { "address.country": regex },
                { "address.name": regex },
                { "address.addressLine1": regex },
                { "address.addressLine2": regex },
                { "address.postalCode": regex },
                { "address.phone": regex },
                { giftMessage: regex },
            ],
        });
        res.status(200).json({
            message: "Searched your orders successfully",
            orders,
        });
    }
    catch (error) {
        next(error); // Ensure the error is passed to the next middleware
    }
});
exports.searchOrders = searchOrders;
const updateOrderStatus = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { orderId, status, cancelReason } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const order = yield order_model_1.default.findById(orderId);
        if (!order) {
            return next(new Errorhandler_util_1.default(404, "Order not found"));
        }
        // we need to implement this in later after testing of this website
        // if (
        //   (user.role !== "admin" && user.role !== "delivery_boy") ||
        //   (user.role === "delivery_boy" && status !== "delivered")
        // ) {
        //   return next(new Errorhandler(403, "You are not authorized to update this order"));
        // }
        if (status === "cancelled") {
            if (order.orderStatus === "delivered") {
                return next(new Errorhandler_util_1.default(400, "You can't cancel order because already order is delivered"));
            }
            order.orderStatus = "cancelled";
            order.cancelReason = cancelReason;
            order.cancellationDate = new Date();
            order.deliveryBoyId = userId;
            yield Promise.all(order.products.map((item) => __awaiter(void 0, void 0, void 0, function* () {
                const product = yield product_model_1.Product.findById(item.productId);
                if (product) {
                    const variant = product.variants.find((variant) => variant._id.toString() === item.variantId.toString());
                    if (variant) {
                        variant.stock += item.quantity;
                        yield product.save();
                    }
                }
            })));
            if (order.payment.paymentStatus === "completed") {
                const refund = yield (0, exports.refundPayment)(order.payment.paymentId, order.finalAmount);
                if (refund.success) {
                    return next(new Errorhandler_util_1.default(400, "Refund Failed"));
                }
                order.payment.paymentStatus = "refunded";
                // order.refund = {
                //   requested: true,
                //   amount: order.totalAmount,
                //   status: "completed",
                //   requestDate: new Date(),
                //   completionDate: new Date(),
                // };
                order.auditLog.push({
                    action: "order_cancelled",
                    actor: order.user, // Assuming `userId` holds the ID of the user performing the action
                    timestamp: new Date(),
                    description: "Order has been cancelled due to the following reason: " +
                        cancelReason,
                });
                yield order.save();
            }
        }
        else if (status === "delivered") {
            const isOntime = new Date() <= new Date(order.expectedDeliveryTime);
            order.deliveryTime = new Date();
            order.isDeliveredOnTime = isOntime;
            if (order.deliveryBoyId) {
                const deliveryBoy = yield usermodel_1.default.findById(order.deliveryBoyId);
                if (deliveryBoy) {
                    const earning = calculateEarnings(order.totalAmount, isOntime);
                    deliveryBoy.DeliveryBoyEarnings.totalEarnings += earning;
                    deliveryBoy.DeliveryBoyEarnings.earningHistory.push({
                        orderId: order._id,
                        date: new Date(),
                        amount: earning,
                    });
                    yield deliveryBoy.save();
                    const socketId = __1.userSocketMap.get(order.user.toString());
                    console.log("this is a map :", __1.userSocketMap);
                    if (!socketId) {
                        console.log("Socket ID is undefined for user:", order.user.toString());
                    }
                    else {
                        __1.io.to(socketId).emit("orderDelivered", {
                            message: "Your order has been delivered. Please rate your experience.",
                            deliveryBoyID: deliveryBoy._id,
                        });
                        console.log("Web socket has sent a message: order is delivered");
                    }
                }
            }
        }
        order.orderStatus = status;
        order.deliveryBoyId = userId;
        yield order.save();
        res.status(200).json({
            message: `order ${status} successfully`,
            order,
        });
    }
    catch (error) {
        next();
    }
});
exports.updateOrderStatus = updateOrderStatus;
const processReturnedItems = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId, returnItems } = req.body;
        console.log("this is a return items :", returnItems);
        // Find the order by ID
        const order = yield order_model_1.default.findById(orderId);
        if (!order) {
            return next(new Errorhandler_util_1.default(404, "Order not found"));
        }
        // Calculate total refund amount for eligible return items
        let totalRefundAmount = 0;
        let totalAmount = 0;
        let discountAmount = 0;
        // Check if the order contains return items
        const itemsToProcess = order.products.filter((product) => returnItems.some((item) => item.productId.toString() === product.productId.toString() &&
            item.variantId.toString() === product.variantId.toString()));
        // Update product stocks and mark items as returned
        yield Promise.all(itemsToProcess.map((orderProduct) => __awaiter(void 0, void 0, void 0, function* () {
            const returnedItem = returnItems.find((item) => item.productId === orderProduct.productId.toString());
            if (returnedItem) {
                const product = yield product_model_1.Product.findById(orderProduct.productId);
                if (!product) {
                    throw new Errorhandler_util_1.default(404, `Product not found`);
                }
                // Update stock for the returned item
                const variant = product.variants.find((v) => v._id.toString() === returnedItem.variantId.toString());
                if (variant) {
                    // Increment the stock of the variant
                    variant.stock += returnedItem.quantity;
                    // Update the return status of the order product
                    if (orderProduct.refund) {
                        orderProduct.refund.status = "completed"; // Mark as returned
                        orderProduct.refund.completionDate = new Date(); // Set received date
                    }
                    // totalAmount += product.priceAtPurchase * product.quantity;
                    // discountAmount += product.discount * product.quantity;
                    // Calculate refund amount
                    totalAmount += returnedItem.priceAtPurchase * returnedItem.quantity;
                    discountAmount += returnedItem.discount * returnedItem.quantity;
                }
                else {
                    throw new Errorhandler_util_1.default(404, `Variant not found for product`);
                }
                // Save the updated product stock
                yield product.save();
            }
        })));
        totalRefundAmount = totalAmount - discountAmount;
        console.log("this is a totask refun amount :", totalRefundAmount);
        // Save the updated order with the modified refund statuses
        yield order.save();
        // Process the payment refund
        const paymentRefundResponse = yield (0, exports.refundPayment)(order.payment.paymentId, totalRefundAmount);
        if (!paymentRefundResponse.success) {
            return next(new Errorhandler_util_1.default(500, "Refund failed"));
        }
        // Return success response
        res.status(200).json({
            success: true,
            message: "Returned items processed successfully. Product stocks updated and refund initiated.",
            order,
            refundDetails: paymentRefundResponse.data, // Include refund details in the response
        });
    }
    catch (error) {
        console.log("Error occurred while processing returned items:", error);
        next(new Errorhandler_util_1.default(500, "An error occurred while processing returned items"));
    }
});
exports.processReturnedItems = processReturnedItems;
const FilterOrdersForAdmin = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const { deliveryType, orderStatus, userId, startDate, endDate, productId, page = 1, limit = 10, searchTerm, } = req.query;
        // Convert page and limit to numbers
        const pageNumber = parseInt(page, 10);
        const limitNumber = parseInt(limit, 10);
        // Validate pagination inputs
        if (pageNumber < 1) {
            return res.status(400).json({
                success: false,
                message: "Page number must be greater than 0.",
            });
        }
        if (limitNumber < 1) {
            return res.status(400).json({
                success: false,
                message: "Limit must be greater than 0.",
            });
        }
        const filter = {};
        if (deliveryType) {
            filter.deliveryType = deliveryType;
        }
        if (orderStatus) {
            filter.orderStatus = orderStatus;
        }
        if (userId) {
            filter.user = userId;
        }
        if (productId) {
            filter.products = Object.assign(Object.assign({}, filter.products), { productId: productId });
        }
        // Add search functionality
        if (searchTerm) {
            const regex = new RegExp(searchTerm, "i"); // Create a case-insensitive regex
            filter.$or = [
                { "user.name": regex }, // Assuming user has a name field
                { "products.productName": regex }, // Assuming product has a productName field
                { orderStatus: regex }, // Search in order status
                // Add other fields that should be searchable here
            ];
        }
        // Date filtering
        if (startDate || endDate) {
            filter.createdAt = {};
            if (startDate) {
                filter.createdAt.$gte = new Date(startDate.toString());
            }
            if (endDate) {
                filter.createdAt.$lte = new Date(endDate.toString());
            }
        }
        const UserId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const user = yield usermodel_1.default.findById(UserId);
        if (!user) {
            return next(new Errorhandler_util_1.default(404, "User not found "));
        }
        const orders = yield order_model_1.default.find(Object.assign(Object.assign({}, filter), { "address.postalCode": (_b = user.deliveryArea) === null || _b === void 0 ? void 0 : _b.postalCode }))
            .populate("user")
            .populate("products.productId")
            .skip((pageNumber - 1) * limitNumber)
            .limit(limitNumber);
        const totalOrders = yield order_model_1.default.countDocuments(filter);
        res.status(200).json({
            success: true,
            orders,
            pagination: {
                totalOrders,
                totalPages: Math.ceil(totalOrders / limitNumber),
                currentPage: pageNumber,
                limit: limitNumber,
            },
        });
    }
    catch (error) {
        next(error);
    }
});
exports.FilterOrdersForAdmin = FilterOrdersForAdmin;
const GetSingleOrder = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderId } = req.params;
        const order = yield order_model_1.default.findById(orderId).populate("products.productId");
        if (!order) {
            return next(new Errorhandler_util_1.default(404, "order not found "));
        }
        res.status(200).json({
            order,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.GetSingleOrder = GetSingleOrder;
