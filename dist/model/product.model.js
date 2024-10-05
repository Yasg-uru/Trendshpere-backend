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
exports.ProductDiscount = exports.ProductReview = exports.ProductVariant = exports.Product = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const ReturnPolicySchema = new mongoose_1.Schema({
    eligible: { type: Boolean, default: false },
    refundDays: { type: Number, default: 0 },
    terms: { type: String },
});
const ReplacementPolicySchema = new mongoose_1.Schema({
    elgible: {
        type: Boolean,
        default: false,
    },
    replacementDays: { type: Number, default: 0 },
    terms: { type: String },
    vaildReason: { type: [String], required: [true, "Valid reason is required"] },
});
const ReviewImageSchema = new mongoose_1.Schema({
    url: { type: String, required: true },
    description: {
        type: String,
    },
    createdAt: { type: Date, default: Date.now() },
});
// Schema for Product Reviews
const productReviewSchema = new mongoose_1.Schema({
    customerId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    comment: { type: String, required: true },
    rating: { type: Number, min: 0, max: 5, required: true },
    createdAt: { type: Date, default: Date.now() },
    helpfulCount: { type: Number, default: 0 },
    helpfulcountgivenBy: [
        {
            type: mongoose_1.Schema.Types.ObjectId,
            ref: "User",
        },
    ],
    isVerifiedPurchase: { type: Boolean, default: false },
    images: [ReviewImageSchema],
});
// Schema for Product Discount
const productDiscountSchema = new mongoose_1.Schema({
    discountPercentage: { type: Number, required: true },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
});
// Schema for Product Variants
const productVariantSchema = new mongoose_1.Schema({
    size: [
        {
            size: String,
            stock: Number,
        },
    ],
    color: { type: String, required: true },
    material: { type: String, required: true },
    price: { type: Number, required: true },
    stock: { type: Number, required: true },
    sku: { type: String, required: true },
    images: { type: [String], required: true }, // Array of images specific to the variant
    available: { type: Boolean, required: true },
});
// Main Product Schema
const productSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    category: { type: String, required: true },
    subcategory: { type: String, required: true },
    childcategory: { type: String, required: true },
    gender: { type: String, default: null },
    description: { type: String, required: true },
    basePrice: { type: Number, required: true }, // Base price before any variant-specific pricing
    materials: { type: [String], required: true },
    sustainabilityRating: { type: Number, min: 0, max: 5, default: 0 },
    available: { type: Boolean, default: true }, // Availability for the base product
    brand: { type: String, required: true },
    overallStock: { type: Number, default: 0 }, // Automatically calculated based on variant stock
    defaultImage: { type: String, required: true }, // Main product image
    variants: [productVariantSchema], // Embedded schema for product variants
    reviews: [productReviewSchema], // Array of customer reviews
    rating: { type: Number, min: 0, max: 5, default: 0 }, // Average product rating
    discount: { type: productDiscountSchema }, // Optional discount schema
    highlights: [String],
    productDetails: {
        type: Map,
        of: String,
    },
    loyalityPoints: {
        type: Number,
        default: 0,
    },
    returnPolicy: { type: ReturnPolicySchema },
    replcementPolicy: { type: ReplacementPolicySchema },
});
// Functionality for calculating overall stock from variants
productSchema.methods.calculateOverallStock = function () {
    this.overallStock = this.variants.reduce((total, variant) => total + variant.stock, 0);
};
// Functionality to check if a product or variant is available
productSchema.methods.isProductAvailable = function () {
    // A product is available if any of its variants are available
    return this.variants.some((variant) => variant.available);
};
productSchema.index({
    name: "text",
    description: "text",
    category: "text",
    brand: "text",
    tags: "text",
});
// Models
exports.Product = mongoose_1.default.model("Product", productSchema);
exports.ProductVariant = mongoose_1.default.model("ProductVariant", productVariantSchema);
exports.ProductReview = mongoose_1.default.model("ProductReview", productReviewSchema);
exports.ProductDiscount = mongoose_1.default.model("ProductDiscount", productDiscountSchema);
