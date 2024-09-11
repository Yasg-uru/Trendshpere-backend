import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  user: Schema.Types.ObjectId; // Reference to the User
  products: {
    productId: Schema.Types.ObjectId; // Reference to the Product
    variantId: Schema.Types.ObjectId; // Reference to the ProductVariant
    quantity: number;
    priceAtPurchase: number; // Price per item at the time of order
    discount: number; // Discount applied on the product, if any
  }[];
  totalAmount: number; // Total amount for the order (before discounts, taxes)
  discountAmount?: number; // Total discount applied to the order
  couponCode?: string; // Applied coupon code
  taxAmount?: number; // Tax applied to the total order amount
  finalAmount: number; // Final amount after applying discounts and taxes
  shippingDetails: {
    method: string; // Shipping method (e.g., Standard, Express)
    cost: number; // Shipping cost
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      postalCode: string;
    };
    estimatedDelivery: Date; // Estimated delivery date
    trackingNumber?: string; // Tracking number from the shipping provider
    status?:
      | "pending"
      | "shipped"
      | "in-transit"
      | "out-for-delivery"
      | "delivered";
  };
  payment: {
    paymentId: string; // Payment provider ID (e.g., Razorpay, Stripe)
    provider: string; // Payment provider (e.g., Razorpay, Stripe, PayPal)
    paymentMethod: string; // Payment method (e.g., card, UPI, bank transfer)
    paymentStatus: "pending" | "completed" | "failed" | "refunded";
    paymentDate?: Date; // Date of successful payment
  };
  orderStatus:
    | "pending"
    | "processing"
    | "shipped"
    | "delivered"
    | "returned"
    | "cancelled";
  createdAt: Date;
  updatedAt: Date;
  returnRequest?: {
    requested: boolean;
    reason?: string;
    status?: "pending" | "approved" | "rejected";
    requestDate?: Date;
    responseDate?: Date;
  };
  refund?: {
    requested: boolean;
    amount: number;
    status: "pending" | "completed" | "failed";
    requestDate?: Date;
    completionDate?: Date;
  };
  auditLog: {
    action: string; // E.g., "status_change", "payment_update", etc.
    actor: Schema.Types.ObjectId; // Reference to the user/admin who performed the action
    timestamp: Date;
    description?: string; // Detailed description of the action
  }[];
  affiliateDetails?: {
    affiliateId: Schema.Types.ObjectId; // Reference to the affiliate
    commissionAmount: number; // Commission for the affiliate
  };
  loyaltyPointsUsed?: number; // Loyalty points applied to this order
  isGiftOrder?: boolean; // Whether this order is marked as a gift
  giftMessage?: string; // Personalized message for gift orders
}

const orderSchema: Schema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    products: [
      {
        productId: {
          type: Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        variantId: {
          type: Schema.Types.ObjectId,
          ref: "ProductVariant",
          required: true,
        },
        quantity: { type: Number, required: true },
        priceAtPurchase: { type: Number, required: true },
        discount: { type: Number, default: 0 },
      },
    ],
    totalAmount: { type: Number, required: true },
    discountAmount: { type: Number, default: 0 },
    couponCode: { type: String },
    taxAmount: { type: Number },
    finalAmount: { type: Number, required: true }, // After discounts and taxes
    shippingDetails: {
      method: { type: String, required: true },
      cost: { type: Number, required: true },
      address: {
        street: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        country: { type: String, required: true },
        postalCode: { type: String, required: true },
      },
      estimatedDelivery: { type: Date },
      trackingNumber: { type: String },
      status: {
        type: String,
        enum: [
          "pending",
          "shipped",
          "in-transit",
          "out-for-delivery",
          "delivered",
        ],
        default: "pending",
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
    orderStatus: {
      type: String,
      enum: [
        "pending",
        "processing",
        "shipped",
        "delivered",
        "returned",
        "cancelled",
      ],
      default: "pending",
    },
    returnRequest: {
      requested: { type: Boolean, default: false },
      reason: { type: String },
      status: { type: String, enum: ["pending", "approved", "rejected"] },
      requestDate: { type: Date },
      responseDate: { type: Date },
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
    auditLog: [
      {
        action: { type: String, required: true },
        actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
        timestamp: { type: Date, default: Date.now },
        description: { type: String },
      },
    ],
    affiliateDetails: {
      affiliateId: { type: Schema.Types.ObjectId, ref: "Affiliate" },
      commissionAmount: { type: Number },
    },
    loyaltyPointsUsed: { type: Number, default: 0 },
    isGiftOrder: { type: Boolean, default: false },
    giftMessage: { type: String },
  },
  { timestamps: true }
);

const Ordermodel = mongoose.model<IOrder>("Order", orderSchema);
export default Ordermodel;
