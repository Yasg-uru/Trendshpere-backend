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
  profileUrl: string;
  verifyCode: string;
  isVerified: boolean;
  verifyCodeExpiry: Date;
  Role: "user" | "admin";

  ResetPasswordToken: string | undefined;
  ResetPasswordTokenExpire: Date | undefined;

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
    profileUrl: {
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
      enum: ["user", "admin"],
      default: "user",
    },

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
