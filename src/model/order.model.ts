import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  user: Schema.Types.ObjectId; // Reference to the User

  products: {
    productId: Schema.Types.ObjectId; // Reference to the Product
    variantId: Schema.Types.ObjectId; // Reference to the ProductVariant
    quantity: number;
    size: string;
    priceAtPurchase: number; // Price per item at the time of order
    discount: number; // Discount applied on the product, if any
    discountByCoupon: number;
    isReplaceable: boolean;
    isReturnable: boolean;
    refund?: {
      requested: boolean;
      amount: number;
      status: "pending" | "completed" | "failed";
      requestDate?: Date;
      completionDate?: Date;
    };
    replacement?: {
      requested: boolean;
      reason?: string;
      status?: "pending" | "approved" | "rejected";
      requestDate?: Date;
      responseDate?: Date;
    };
  }[];
  totalAmount: number; // Total amount for the order (before discounts, taxes)
  discountAmount?: number; // Total discount applied to the order
  couponCode?: string; // Applied coupon code
  taxAmount?: number; // Tax applied to the total order amount
  finalAmount: number; // Final amount after applying discounts and taxes
  deliveryType: "standard" | "express";
  deliveryCharge?: number;
  address: {
    name: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
    phone: string;
    type: "Home" | "University" | "Work" | "Hotel";
  };
  payment: {
    paymentId: string; // Payment provider ID (e.g., Razorpay, Stripe)
    provider: string; // Payment provider (e.g., Razorpay, Stripe, PayPal)
    paymentMethod: string; // Payment method (e.g., card, UPI, bank transfer)
    paymentStatus: "pending" | "completed" | "failed" | "refunded";
    paymentDate?: Date; // Date of successful payment
  };
  cancellationDate: Date;
  cancelReason: string;
  orderStatus: string;
  createdAt: Date;
  updatedAt: Date;

  auditLog: {
    action: string;
    actor: Schema.Types.ObjectId;
    timestamp: Date;
    description?: string;
  }[];

  loyaltyPointsUsed?: number;
  isGiftOrder?: boolean;
  giftMessage?: string;
}

const orderSchema: Schema = new Schema<IOrder>(
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
      

      ],
      default: "pending",
    },

    auditLog: [
      {
        action: { type: String, required: true },
        actor: { type: Schema.Types.ObjectId, ref: "User", required: true },
        timestamp: { type: Date, default: Date.now },
        description: { type: String },
      },
    ],

    loyaltyPointsUsed: { type: Number, default: 0 },
    isGiftOrder: { type: Boolean, default: false },
    giftMessage: { type: String },
  },
  { timestamps: true }
);
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
const Ordermodel = mongoose.model<IOrder>("Order", orderSchema);
export default Ordermodel;
