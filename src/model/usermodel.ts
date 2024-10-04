import mongoose, { Schema, Document } from "mongoose";
import bcrypt from "bcrypt";
import { NextFunction } from "express";
import jwt from "jsonwebtoken";
import { JwtDecodedUser } from "../types/jwtDecodedUser";
import crypto from "crypto";

export interface User extends Document {
  username: string;
  email: string;
  password: string;
  avatar?: string;
  verifyCode: string;
  isVerified: boolean;
  verifyCodeExpiry: Date;
  Role: "user" | "admin" | "delivery_boy";
  bodyMeasurements: {
    height: number;
    weight: number;
    chestSize?: number;
    waistSize?: number;
    hipSize?: number;
  };
  preferences: {
    style: string;
    favoriteColors: string[];
    preferredMaterials: string[];
  };
  tryOnHistory: {
    productId: Schema.Types.ObjectId;
    tryOnImage: string;
    date: Date;
  }[];
  cart: {
    productId: Schema.Types.ObjectId;
    quantity: number;
    variantId: Schema.Types.ObjectId;
    size: string;
    _id?: string;
  }[];
  orderHistory: {
    orderId: Schema.Types.ObjectId;
    purchaseDate: Date;
    totalAmount: number;
  }[];
  wishlist: Schema.Types.ObjectId[];
  paymentMethods: {
    type: string; // 'Card', 'UPI', 'NetBanking'
    details: string;
    expirationDate?: string;
    lastUsed: Date;
  }[];
  loyaltyPoints: number;
  browsingHistory: Schema.Types.ObjectId[];
  ResetPasswordToken: string | undefined;
  ResetPasswordTokenExpire: Date | undefined;
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
    _id?: string;
  }[];
  deliveryArea?: {
    state: string;
    postalCode: string;
    country: string;
    city: string;
  };
  status?: "active" | "inactive";
  vehicleDetails?: {
    type: string;
    numberPlate: string;
  };
  DeliveryBoyEarnings:{
    totalEarnings:number ;
    earningHistory:{
      orderId:Schema.Types.ObjectId;
      date:Date;
      amount:number;
    }[];
  };
  deliveryBoyRatings: {
    ratings: number;
    totalRatings: number;
    rateBy:Schema.Types.ObjectId[];
  };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateToken(): string;
  ResetToken(): void;
}
const userSchema = new Schema<User>(
  {
    username: {
      type: String,
      trim: true,
      required: [true, "Please Enter user name"],
    },
    email: {
      type: String,
      trim: true,
      required: [true, "Email is required"],
      unique: true,
      match: [
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/,
        "please enter valid email ",
      ],
    },
    password: {
      type: String,
      required: [true, "password is mendatory"],
      minlength: [
        5,
        "your password should be greater than length of 5 characters",
      ],
    },
    deliveryArea: {
      state: {
        type: String,
      },
      postalCode: {
        type: String,
      },
      country: {
        type: String,
      },
      city: {
        type: String,
      },
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
    },
    vehicleDetails: {
      type: {
        type: String,
      },
      numberPlate: {
        type: String,
      },
    },
    deliveryBoyRatings: {
      totalRatings: {
        type: Number,
        default: 0,
      },
      ratings: {
        type: Number,
        default: 0,
      },
      rateBy:[{
        type:Schema.Types.ObjectId,
        ref:'User'
      }]
    },
    DeliveryBoyEarnings:{
      totalEarnings:{type:Number ,
       default:0
      },
      earningHistory:[
        {
          orderId:{
            type:Schema.Types.ObjectId,
            ref:'Order'
          },
          date:{
            type:Date,
            default:Date.now()
          },
          amount:{
            type:Number ,
            default:0
          }
        }
      ]
    },
    avatar: {
      type: String,
    },
    verifyCode: {
      type: String,
      required: [true, "Verify code is mendatory"],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifyCodeExpiry: {
      type: Date,
      required: [true, "verify code date is expiry"],
    },
    Role: {
      type: String,
      enum: ["user", "admin", "delivery_boy"],
      default: "user",
    },
    address: [
      {
        name: {
          type: String,
        },
        addressLine1: { type: String },
        addressLine2: { type: String },
        city: { type: String },
        state: { type: String },
        postalCode: { type: String },
        country: { type: String },
        phone: { type: String },
        type: {
          type: String,
          required: [true, "Address type is required "],
          enum: ["Home", "University", "Work", "Hotel"],
        },
      },
    ],
    preferences: {
      style: { type: String },
      favoriteColors: [{ type: String }],
      preferredMaterials: [{ type: String }],
    },
    tryOnHistory: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        tryOnImage: { type: String },
        date: { type: Date, default: Date.now },
      },
    ],
    cart: [
      {
        productId: { type: Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, required: true },
        variantId: {
          type: Schema.Types.ObjectId,
          ref: "ProductVariant",
          required: true,
        },
        size: {
          type: String,
          // required: [true, "Size is required"],
        },
      },
    ],
    orderHistory: [
      {
        orderId: { type: Schema.Types.ObjectId, ref: "Order" },
        purchaseDate: { type: Date, default: Date.now },
        totalAmount: { type: Number, required: true },
      },
    ],
    wishlist: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    paymentMethods: [
      {
        type: { type: String, required: true },
        details: { type: String, required: true },
        expirationDate: { type: String },
        lastUsed: { type: Date, default: Date.now },
      },
    ],
    loyaltyPoints: { type: Number, default: 0 },
    browsingHistory: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    ResetPasswordToken: {
      type: String,
    },
    ResetPasswordTokenExpire: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);
userSchema.pre("save", async function (next): Promise<void> {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});
userSchema.methods.generateToken = function (): string {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.Role },
    process.env.JWT_SECRET as string,
    {
      expiresIn: process.env.JWT_EXPIRE,
    }
  );
};
userSchema.methods.comparePassword = async function (
  oldpassword: string
): Promise<boolean> {
  return await bcrypt.compare(oldpassword, this.password);
};
userSchema.methods.ResetToken = function (): void {
  this.ResetPasswordToken = crypto.randomBytes(20).toString("hex");
  this.ResetPasswordTokenExpire = new Date(Date.now() + 3600000);
};

const usermodel = mongoose.model<User>("User", userSchema);
export default usermodel;
