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
exports.getUserData = exports.updateAddress = exports.AddNewAddress = exports.GetCarts = exports.Resetpassword = exports.forgotPassword = exports.Logout = exports.Login = exports.verifyuser = exports.registerUser = void 0;
// import catchAsync from "../middleware/catchasync.middleware";
const usermodel_1 = __importDefault(require("../model/usermodel"));
const bcrypt_1 = __importDefault(require("bcrypt"));
const sendmail_util_1 = __importStar(require("../util/sendmail.util"));
const cloudinary_util_1 = __importDefault(require("../util/cloudinary.util"));
const Errorhandler_util_1 = __importDefault(require("../util/Errorhandler.util"));
const sendtoken_1 = __importDefault(require("../util/sendtoken"));
const catchasync_middleware_1 = __importDefault(require("../middleware/catchasync.middleware"));
exports.registerUser = (0, catchasync_middleware_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { username, email, password, preferences } = req.body;
        console.log("This is req.body:", req.body);
        // Check if the user with the email exists and is verified
        const ExistingUser = yield usermodel_1.default.findOne({ email, isVerified: true });
        if (ExistingUser) {
            return next(new Errorhandler_util_1.default(400, "User already exists"));
        }
        // Check if the user exists but is unverified
        const ExistingUserUnVerified = yield usermodel_1.default.findOne({
            email,
            isVerified: false,
        });
        let verifyCode = Math.floor(100000 + Math.random() * 900000).toString();
        const verifyCodeExpiry = new Date(Date.now() + 3600000); // 1-hour expiry
        if (ExistingUserUnVerified) {
            // Update password and verification code for the unverified user
            ExistingUserUnVerified.password = password;
            ExistingUserUnVerified.verifyCode = verifyCode;
            ExistingUserUnVerified.verifyCodeExpiry = verifyCodeExpiry;
            yield ExistingUserUnVerified.save();
            const emailResponse = yield (0, sendmail_util_1.default)(username, email, verifyCode);
            if (!emailResponse.success) {
                return next(new Errorhandler_util_1.default(400, emailResponse.message));
            }
        }
        else {
            // For new users
            let profileUrl = null;
            if (req.file && req.file.path) {
                // If there's an avatar image, upload to Cloudinary
                const cloudinaryUrl = yield (0, cloudinary_util_1.default)(req.file.path);
                profileUrl = cloudinaryUrl === null || cloudinaryUrl === void 0 ? void 0 : cloudinaryUrl.secure_url;
            }
            // Create a new user with optional fields
            const newUser = new usermodel_1.default({
                username,
                email,
                password,
                avatar: profileUrl,
                verifyCode,
                verifyCodeExpiry,
                isVerified: false,
                preferences: preferences || {}, // default empty preferences
            });
            yield newUser.save();
            const emailResponse = yield (0, sendmail_util_1.default)(username, email, verifyCode);
            if (!emailResponse.success) {
                return next(new Errorhandler_util_1.default(400, emailResponse.message));
            }
        }
        res.status(201).json({
            success: true,
            message: "User registered successfully, please verify your account",
        });
    }
    catch (error) {
        console.log(error);
        return next(new Errorhandler_util_1.default(500, "Internal server error"));
    }
}));
exports.verifyuser = (0, catchasync_middleware_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, code } = req.body;
        console.log("this is a req.body in user verification :", req.body);
        const user = yield usermodel_1.default.findOne({ email });
        if (!user) {
            return next(new Errorhandler_util_1.default(404, "user not found with this email"));
        }
        const isValidCode = user.verifyCode === code;
        const isNotCodeExpired = new Date(user.verifyCodeExpiry) > new Date();
        if (isValidCode && isNotCodeExpired) {
            user.isVerified = true;
            yield user.save();
            res.status(200).json({
                success: true,
                message: "your account has been successfully verified",
            });
        }
        else if (!isNotCodeExpired) {
            return next(new Errorhandler_util_1.default(404, "Verification code has expired. Please sign up again to get a new code."));
        }
        else {
            return next(new Errorhandler_util_1.default(404, "Incorrect verification code . please signup again to get a new code"));
        }
    }
    catch (error) {
        return next(new Errorhandler_util_1.default(404, error));
    }
}));
exports.Login = (0, catchasync_middleware_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email, password } = req.body;
        console.log("this is a req.body:", req.body);
        if (!email || !password) {
            return next(new Errorhandler_util_1.default(404, "Please Enter credentials"));
        }
        const user = yield usermodel_1.default
            .findOne({ email })
            .populate("cart.productId cart.variantId");
        if (!user) {
            return next(new Errorhandler_util_1.default(404, "Invalid credentials"));
        }
        if (!user.isVerified) {
            return next(new Errorhandler_util_1.default(400, "Access denied, Please verify your account first "));
        }
        const isCorrectPassword = yield bcrypt_1.default.compare(password, user.password);
        if (!isCorrectPassword) {
            console.log(isCorrectPassword + "i am getting incorrect password mismatch");
            return next(new Errorhandler_util_1.default(404, "Invalid credentials"));
        }
        const token = user.generateToken();
        (0, sendtoken_1.default)(res, token, 200, user);
    }
    catch (error) {
        console.log("Error Login", error);
        return next(new Errorhandler_util_1.default(500, "Internal server Error "));
    }
}));
exports.Logout = (0, catchasync_middleware_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    res
        .cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: false,
        sameSite: "none",
        secure: true,
    })
        .status(200)
        .json({
        success: true,
        message: "Logged out successfully",
    });
}));
exports.forgotPassword = (0, catchasync_middleware_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { email } = req.body;
        const user = yield usermodel_1.default.findOne({ email });
        if (!user) {
            return next(new Errorhandler_util_1.default(404, "User not found"));
        }
        user.ResetToken();
        yield user.save();
        const resetUrl = `http://localhost:5173/reset-password/${user.ResetPasswordToken}`;
        const mailresponse = yield (0, sendmail_util_1.sendResetPasswordMail)(resetUrl, email);
        if (!mailresponse.success) {
            return next(new Errorhandler_util_1.default(403, mailresponse.message));
        }
        res.status(200).json({
            success: true,
            message: "sent forgot password email successfully",
        });
    }
    catch (error) {
        return next(new Errorhandler_util_1.default(500, "Error forgot password"));
    }
}));
exports.Resetpassword = (0, catchasync_middleware_1.default)((req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { token } = req.params;
        const { password } = req.body;
        //finding the user by this resettoken
        const user = yield usermodel_1.default.findOne({
            ResetPasswordToken: token,
            ResetPasswordTokenExpire: { $gt: new Date() },
        });
        if (!user) {
            return next(new Errorhandler_util_1.default(404, "Resetpassword token has been expired"));
        }
        user.password = password;
        user.ResetPasswordToken = undefined;
        user.ResetPasswordTokenExpire = undefined;
        yield user.save();
        res.status(200).json({
            success: true,
            message: "your reset password successfully",
        });
    }
    catch (error) {
        return next(new Errorhandler_util_1.default(500, "Error password Reset"));
    }
}));
const GetCarts = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const user = yield usermodel_1.default.findById(userId).populate("cart.productId");
        if (!user) {
            return next(new Errorhandler_util_1.default(404, "User not found "));
        }
        const carts = user.cart.map((item) => {
            const product = item.productId;
            const variants = product.variants.find((variant) => variant._id.toString() === item.variantId.toString());
            return {
                title: product.name,
                size: item.size,
                color: variants === null || variants === void 0 ? void 0 : variants.color,
                quantity: item.quantity,
                productId: product._id,
                variantId: variants === null || variants === void 0 ? void 0 : variants._id,
                price: variants === null || variants === void 0 ? void 0 : variants.price,
                stocks: variants === null || variants === void 0 ? void 0 : variants.stock,
                image: variants === null || variants === void 0 ? void 0 : variants.images[0],
                discount: product.discount,
                returnPolicy: product.returnPolicy,
                replacementPolicy: product.replcementPolicy,
                loyaltyPoints: product.loyalityPoints,
            };
        });
        res.status(200).json({
            message: "Fetched successfully carts ",
            carts,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.GetCarts = GetCarts;
const AddNewAddress = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { name, addressLine1, addressLine2, city, state, postalCode, country, phone, type, } = req.body;
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const user = yield usermodel_1.default.findById(userId);
        if (!user) {
            return next(new Errorhandler_util_1.default(404, "User not found "));
        }
        user.address.push({
            name,
            addressLine1,
            addressLine2,
            city,
            state,
            postalCode,
            country,
            phone,
            type,
        });
        yield user.save();
        res.status(200).json({
            message: "Successfully added new address",
            user,
        });
    }
    catch (error) {
        next(new Errorhandler_util_1.default(500, "Internal server error"));
    }
});
exports.AddNewAddress = AddNewAddress;
const updateAddress = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
        const { addressId } = req.params;
        const { name, addressLine1, addressLine2, city, state, postalCode, country, phone, type, } = req.body;
        const user = yield usermodel_1.default.findById(userId);
        if (!user) {
            return next(new Errorhandler_util_1.default(404, "user not found "));
        }
        const address = user.address.find((address) => { var _a; return ((_a = address === null || address === void 0 ? void 0 : address._id) === null || _a === void 0 ? void 0 : _a.toString()) === addressId.toString(); });
        if (!address) {
            return next(new Errorhandler_util_1.default(494, "Address Not found "));
        }
        address.name = name || address.name;
        address.addressLine1 = addressLine1 || address.addressLine1;
        address.addressLine2 = addressLine2 || address.addressLine2;
        address.city = city || address.city;
        address.state = state || address.state;
        address.postalCode = postalCode || address.postalCode;
        address.country = country || address.country;
        address.phone = phone || address.phone;
        address.type = type || address.type;
        yield user.save();
        res.status(200).json({
            message: "Updated address successfully",
            user,
        });
    }
    catch (error) {
        next(error);
    }
});
exports.updateAddress = updateAddress;
const getUserData = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const user = yield usermodel_1.default.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
        if (!user) {
            return next(new Errorhandler_util_1.default(404, "User not found "));
        }
        res.status(200).json({
            user
        });
    }
    catch (error) {
        next(error);
    }
});
exports.getUserData = getUserData;
