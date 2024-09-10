import mongoose, { Schema, Document } from "mongoose";

export interface IOrder extends Document {
  user: Schema.Types.ObjectId; // Reference to the User
  products: {
    productId: Schema.Types.ObjectId; // Reference to the Product
    variantId: Schema.Types.ObjectId; // Reference to the ProductVariant
    quantity: number;
  }[];
  totalAmount: number; // Total amount for the order
  paymentId: string; // Razorpay payment ID
  paymentStatus: "pending" | "completed" | "failed";
  orderStatus: "pending" | "shipped" | "delivered" | "returned" | "cancelled";
  createdAt: Date;
  updatedAt: Date;
  returnRequest: {
    requested: boolean;
    reason?: string;
    status?: "pending" | "approved" | "rejected";
    requestDate?: Date;
    responseDate?: Date;
  };
  refund: {
    requested: boolean;
    amount: number;
    status: "pending" | "completed" | "failed";
    requestDate?: Date;
    completionDate?: Date;
  };
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
      },
    ],
    totalAmount: { type: Number, required: true },
    paymentId: { type: String, required: true },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    orderStatus: {
      type: String,
      enum: ["pending", "shipped", "delivered", "returned", "cancelled"],
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
  },
  { timestamps: true }
);

const Order = mongoose.model<IOrder>("Order", orderSchema);
export default Order;
