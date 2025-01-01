import { NextFunction, Request, response, Response } from "express";
// import catchAsync from "../middleware/catchasync.middleware";
import usermodel, { User } from "../model/usermodel";
import bcrypt from "bcrypt";
import sendVerificationMail, {
  sendResetPasswordMail,
} from "../util/sendmail.util";
import UploadOnCloudinary from "../util/cloudinary.util";
import Errorhandler from "../util/Errorhandler.util";
import sendtoken from "../util/sendtoken";
import { reqwithuser } from "../middleware/auth.middleware";
import { Schema, ObjectId } from "mongoose";
import catchAsync from "../middleware/catchasync.middleware";
import { IProduct, IProductVariant } from "../model/product.model";
import jwt from "jsonwebtoken";
import { JwtDecodedUser } from "../types/jwtDecodedUser";
export const registerUser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { username, email, password, preferences } = req.body;
      console.log("This is req.body:", req.body);

      // Check if the user with the email exists and is verified
      const ExistingUser = await usermodel.findOne({ email, isVerified: true });
      if (ExistingUser) {
        return next(new Errorhandler(400, "User already exists"));
      }

      // Check if the user exists but is unverified
      const ExistingUserUnVerified = await usermodel.findOne({
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
        await ExistingUserUnVerified.save();

        const emailResponse = await sendVerificationMail(
          username,
          email,
          verifyCode
        );
        if (!emailResponse.success) {
          return next(new Errorhandler(400, emailResponse.message));
        }
      } else {
        // For new users
        let profileUrl = null;

        if (req.file && req.file.path) {
          // If there's an avatar image, upload to Cloudinary
          const cloudinaryUrl = await UploadOnCloudinary(req.file.path);
          profileUrl = cloudinaryUrl?.secure_url;
        }

        // Create a new user with optional fields
        const newUser = new usermodel({
          username,
          email,
          password,
          avatar: profileUrl,
          verifyCode,
          verifyCodeExpiry,
          isVerified: false,
          preferences: preferences || {}, // default empty preferences
        });

        await newUser.save();

        const emailResponse = await sendVerificationMail(
          username,
          email,
          verifyCode
        );
        if (!emailResponse.success) {
          return next(new Errorhandler(400, emailResponse.message));
        }
      }

      res.status(201).json({
        success: true,
        message: "User registered successfully, please verify your account",
      });
    } catch (error: any) {
      console.log(error);
      return next(new Errorhandler(500, "Internal server error"));
    }
  }
);

export const verifyuser = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, code } = req.body;
      console.log("this is a req.body in user verification :", req.body);
      const user = await usermodel.findOne({ email });
      if (!user) {
        return next(new Errorhandler(404, "user not found with this email"));
      }

      const isValidCode = user.verifyCode === code;
      const isNotCodeExpired = new Date(user.verifyCodeExpiry) > new Date();
      if (isValidCode && isNotCodeExpired) {
        user.isVerified = true;
        await user.save();
        res.status(200).json({
          success: true,
          message: "your account has been successfully verified",
        });
      } else if (!isNotCodeExpired) {
        return next(
          new Errorhandler(
            404,
            "Verification code has expired. Please sign up again to get a new code."
          )
        );
      } else {
        return next(
          new Errorhandler(
            404,
            "Incorrect verification code . please signup again to get a new code"
          )
        );
      }
    } catch (error: any) {
      return next(new Errorhandler(404, error));
    }
  }
);

export const Login = catchAsync(async (req, res, next) => {
  try {
    const { email, password } = req.body;
    console.log("this is a req.body:", req.body);
    if (!email || !password) {
      return next(new Errorhandler(404, "Please Enter credentials"));
    }
    const user = await usermodel
      .findOne({ email })
      .populate("cart.productId cart.variantId");
    if (!user) {
      return next(new Errorhandler(404, "Invalid credentials"));
    }
    if (!user.isVerified) {
      return next(
        new Errorhandler(
          400,
          "Access denied, Please verify your account first "
        )
      );
    }
    const isCorrectPassword = await bcrypt.compare(password, user.password);
    if (!isCorrectPassword) {
      console.log(
        isCorrectPassword + "i am getting incorrect password mismatch"
      );
      return next(new Errorhandler(404, "Invalid credentials"));
    }
    const token = user.generateToken();
    sendtoken(res, token, 200, user);
  } catch (error: any) {
    console.log("Error Login", error);
    return next(new Errorhandler(500, "Internal server Error "));
  }
});
export const Logout = catchAsync(
  async (req: Request, res: Response, next: NextFunction) => {
    res
      .cookie("token", null, {
        expires: new Date(Date.now()),
        httpOnly: false,
        sameSite: "none" as const,
        secure: true,
      })
      .status(200)
      .json({
        success: true,
        message: "Logged out successfully",
      });
  }
);
export const forgotPassword = catchAsync(
  async (req: reqwithuser, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      const user = await usermodel.findOne({ email });
      if (!user) {
        return next(new Errorhandler(404, "User not found"));
      }
      user.ResetToken();
      await user.save();
      const resetUrl = `http://localhost:5173/reset-password/${user.ResetPasswordToken}`;
      const mailresponse = await sendResetPasswordMail(resetUrl, email);
      if (!mailresponse.success) {
        return next(new Errorhandler(403, mailresponse.message));
      }
      res.status(200).json({
        success: true,
        message: "sent forgot password email successfully",
      });
    } catch (error) {
      return next(new Errorhandler(500, "Error forgot password"));
    }
  }
);
export const Resetpassword = catchAsync(
  async (req: reqwithuser, res: Response, next: NextFunction) => {
    try {
      const { token } = req.params;
      const { password } = req.body;
      //finding the user by this resettoken
      const user = await usermodel.findOne({
        ResetPasswordToken: token,
        ResetPasswordTokenExpire: { $gt: new Date() },
      });
      if (!user) {
        return next(
          new Errorhandler(404, "Resetpassword token has been expired")
        );
      }
      user.password = password;
      user.ResetPasswordToken = undefined;
      user.ResetPasswordTokenExpire = undefined;
      await user.save();
      res.status(200).json({
        success: true,
        message: "your reset password successfully",
      });
    } catch (error) {
      return next(new Errorhandler(500, "Error password Reset"));
    }
  }
);
export const GetCarts = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    const user = await usermodel.findById(userId).populate("cart.productId");
    if (!user) {
      return next(new Errorhandler(404, "User not found "));
    }

    const carts = user.cart.map((item) => {
      const product = item.productId as unknown as IProduct;
      const variants = product.variants.find(
        (variant: IProductVariant) =>
          variant._id.toString() === item.variantId.toString()
      );
      return {
        title: product.name,
        size: item.size,
        color: variants?.color,
        quantity: item.quantity,
        productId: product._id,
        variantId: variants?._id,
        price: variants?.price,
        stocks: variants?.stock,
        image: variants?.images[0],
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
  } catch (error) {
    next(error);
  }
};
export const AddNewAddress = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      name,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      phone,
      type,
    } = req.body;
    const userId = req.user?._id;
    const user = await usermodel.findById(userId);
    if (!user) {
      return next(new Errorhandler(404, "User not found "));
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
    await user.save();
    res.status(200).json({
      message: "Successfully added new address",
      user,
    });
  } catch (error) {
    next(new Errorhandler(500, "Internal server error"));
  }
};
export const updateAddress = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.user?._id;
    const { addressId } = req.params;

    const {
      name,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
      phone,
      type,
    } = req.body;
    const user = await usermodel.findById(userId);
    if (!user) {
      return next(new Errorhandler(404, "user not found "));
    }
    const address = user.address.find(
      (address) => address?._id?.toString() === addressId.toString()
    );
    if (!address) {
      return next(new Errorhandler(494, "Address Not found "));
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
    await user.save();
    res.status(200).json({
      message: "Updated address successfully",
      user,
    });
  } catch (error) {
    next(error);
  }
};
export const getUserData = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = await usermodel.findById(req.user?._id);
    if (!user) {
      return next(new Errorhandler(404, "User not found "));
    }
    res.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
};
export const getuserByToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { token } = req.params;
    const decodedUser = (await jwt.verify(
      token,
      process.env.JWT_SECRET as string
    )) as JwtDecodedUser;
    const user = await usermodel.findById(decodedUser.id);
    if (!user) {
      return next(new Errorhandler(404, "user not found"));
    }
    res.status(200).json({
      user,
    });
  } catch (error) {
    next(error);
  }
};
