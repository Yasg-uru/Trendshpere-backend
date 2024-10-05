"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importStar(require("mongoose"));
const orderSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    products: [
        {
            productId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: "Product",
                required: true,
            },
            variantId: {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: "ProductVariant",
                required: true,
            },
            size: { type: String, required: [true, "size also required"] },
            quantity: { type: Number, required: true },
            priceAtPurchase: { type: Number, required: true },
            discount: { type: Number, default: 0 },
            discountByCoupon: { type: Number, required: true },
            isReplaceable: {
                type: Boolean,
                default: true,
            },
            isReturnable: {
                type: Boolean,
                default: true,
            },
            refund: {
                requested: { type: Boolean, default: false },
                amount: { type: Number },
                status: {
                    type: String,
                    enum: ["pending", "completed", "failed"],
                    default: "pending",
                },
                requestDate: { type: Date },
                completionDate: { type: Date },
            },
            replacement: {
                requested: { type: Boolean, default: false },
                reason: { type: String },
                status: { type: String, enum: ["pending", "approved", "rejected"] },
                requestDate: { type: Date },
                responseDate: { type: Date },
            },
        },
    ],
    totalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String },
    taxAmount: { type: Number },
    finalAmount: { type: Number, required: true }, // After discounts and taxes
    deliveryType: {
        type: String,
        enum: ["standard", "express"],
        default: "standard",
    },
    deliveryCharge: {
        type: Number,
        default: 0,
    },
    address: {
        name: { type: String, required: true },
        addressLine1: { type: String, required: true },
        addressLine2: { type: String },
        city: { type: String, required: true },
        state: { type: String, required: true },
        postalCode: { type: String, required: true },
        country: { type: String, required: true },
        phone: { type: String },
        type: {
            type: String,
            enum: ["Home", "University", "Work", "Hotel"],
            required: true,
        },
    },
    payment: {
        paymentId: { type: String, required: true },
        provider: { type: String, required: true },
        paymentMethod: { type: String, required: true },
        paymentStatus: {
            type: String,
            enum: ["pending", "completed", "failed", "refunded"],
            default: "pending",
        },
        paymentDate: { type: Date },
    },
    cancelReason: { type: String },
    cancellationDate: { type: Date },
    orderStatus: {
        type: String,
        enum: [
            "pending",
            "processing",
            "shipped",
            "delivered",
            "returned",
            "cancelled",
            "replaced",
            "return_requested",
            "replacement_requested",
            "out_for_delivery",
            "delivery_failed",
        ],
        default: "pending",
    },
    deliveryBoyId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
    },
    auditLog: [
        {
            action: { type: String, required: true },
            actor: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
            timestamp: { type: Date, default: Date.now },
            description: { type: String },
        },
    ],
    deliveryTime: { type: Date },
    expectedDeliveryTime: { type: Date },
    isDeliveredOnTime: { type: Boolean, default: false },
    loyaltyPointsUsed: { type: Number, default: 0 },
    isGiftOrder: { type: Boolean, default: false },
    giftMessage: { type: String },
}, { timestamps: true });
orderSchema.index({
    "address.street": "text",
    "address.city": "text",
    "address.state": "text",
    "address.country": "text",
    "address.name": "text",
    "address.addressLine1": "text",
    "address.addressLine2": "text",
    "address.postalCode": "text",
    "address.phone": "text",
    giftMessage: "text",
});
const Ordermodel = mongoose_1.default.model("Order", orderSchema);
exports.default = Ordermodel;
