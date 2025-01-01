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
const mongoose_1 = __importStar(require("mongoose"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const userSchema = new mongoose_1.Schema({
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
        rateBy: [
            {
                type: mongoose_1.Schema.Types.ObjectId,
                ref: "User",
            },
        ],
    },
    delivery_boy_location: {
        type: {
            lat: Number,
            long: Number,
        },
        lastUpdated: Date,
    },
    DeliveryBoyEarnings: {
        totalEarnings: { type: Number, default: 0 },
        earningHistory: [
            {
                orderId: {
                    type: mongoose_1.Schema.Types.ObjectId,
                    ref: "Order",
                },
                date: {
                    type: Date,
                    default: Date.now(),
                },
                amount: {
                    type: Number,
                    default: 0,
                },
            },
        ],
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
            productId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product" },
            tryOnImage: { type: String },
            date: { type: Date, default: Date.now },
        },
    ],
    cart: [
        {
            productId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Product" },
            quantity: { type: Number, required: true },
            variantId: {
                type: mongoose_1.Schema.Types.ObjectId,
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
            orderId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Order" },
            purchaseDate: { type: Date, default: Date.now },
            totalAmount: { type: Number, required: true },
        },
    ],
    wishlist: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Product" }],
    paymentMethods: [
        {
            type: { type: String, required: true },
            details: { type: String, required: true },
            expirationDate: { type: String },
            lastUsed: { type: Date, default: Date.now },
        },
    ],
    loyaltyPoints: { type: Number, default: 0 },
    browsingHistory: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Product" }],
    ResetPasswordToken: {
        type: String,
    },
    ResetPasswordTokenExpire: {
        type: Date,
    },
}, {
    timestamps: true,
});
userSchema.pre("save", function (next) {
    return __awaiter(this, void 0, void 0, function* () {
        if (this.isModified("password")) {
            this.password = yield bcrypt_1.default.hash(this.password, 10);
        }
        next();
    });
});
userSchema.methods.generateToken = function () {
    return jsonwebtoken_1.default.sign({ id: this._id, email: this.email, role: this.Role }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};
userSchema.methods.comparePassword = function (oldpassword) {
    return __awaiter(this, void 0, void 0, function* () {
        return yield bcrypt_1.default.compare(oldpassword, this.password);
    });
};
userSchema.methods.ResetToken = function () {
    this.ResetPasswordToken = crypto_1.default.randomBytes(20).toString("hex");
    this.ResetPasswordTokenExpire = new Date(Date.now() + 3600000);
};
const usermodel = mongoose_1.default.model("User", userSchema);
exports.default = usermodel;
