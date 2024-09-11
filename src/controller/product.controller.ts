import { NextFunction, Request, Response } from "express";
import catchAsync from "../middleware/catchasync.middleware";
import { IProductReview, IReviewImage, Product } from "../model/product.model";
import Errorhandler from "../util/Errorhandler.util";
import usermodel from "../model/usermodel";
import { reqwithuser } from "../middleware/auth.middleware";
import { Schema, Types } from "mongoose";
import mongoose from "mongoose";
import UploadOnCloudinary from "../util/cloudinary.util";
class ProductController {
  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        category,
        description,
        basePrice,
        materials,
        sustainabilityRating,
        available,
        brand,
        defaultImage,
        variants,
        discount,
      } = req.body;

      // Check if the product already exists (optional)
      const existingProduct = await Product.findOne({ name, category });
      if (existingProduct) {
        return res.status(400).json({ message: "Product already exists" });
      }

      // Create a new product
      const newProduct = new Product({
        name,
        category,
        description,
        basePrice,
        materials,
        sustainabilityRating,
        available,
        brand,
        defaultImage,
        variants,
        discount,
      });

      // Calculate overall stock based on variants
      newProduct.calculateOverallStock();

      // Save the product to the database
      const savedProduct = await newProduct.save();

      return res.status(201).json({
        message: "Product created successfully",
        product: savedProduct,
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Server error" });
    }
  }
  public static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const productId = req.params.id;
      const {
        name,
        category,
        description,
        basePrice,
        materials,
        sustainabilityRating,
        available,
        brand,
        defaultImage,
        variants,
        discount,
      } = req.body;

      // Find the product by ID
      const product = await Product.findById(productId);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }

      // Update the product fields
      if (name !== undefined) product.name = name;
      if (category !== undefined) product.category = category;
      if (description !== undefined) product.description = description;
      if (basePrice !== undefined) product.basePrice = basePrice;
      if (materials !== undefined) product.materials = materials;
      if (sustainabilityRating !== undefined)
        product.sustainabilityRating = sustainabilityRating;
      if (available !== undefined) product.available = available;
      if (brand !== undefined) product.brand = brand;
      if (defaultImage !== undefined) product.defaultImage = defaultImage;
      if (variants !== undefined) {
        product.variants = variants; // Handle updating of variants
        product.calculateOverallStock(); // Recalculate stock after updating variants
      }
      if (discount !== undefined) product.discount = discount;

      // Save the updated product
      const updatedProduct = await product.save();

      return res.status(200).json({
        message: "Product updated successfully",
        product: updatedProduct,
      });
    } catch (error) {
      console.error(error);
      next();
    }
  }
  public static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { productId } = req.params;
      const product = await Product.findById(productId);
      if (!product) {
        return next(new Errorhandler(404, "Product Not found"));
      }
      res.status(200).json({
        message: "product deleted successfully",
      });
    } catch (error) {
      next();
    }
  }
  public static async cart(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { productId, variantId } = req.params;
      const { quantity } = req.body;
      const user = await usermodel.findById(req.user?._id);
      if (!user) {
        return next(new Errorhandler(404, "User not found "));
      }
      user.cart.push({
        productId: productId as unknown as Schema.Types.ObjectId,
        variantId: variantId as unknown as Schema.Types.ObjectId,
        quantity,
      });
      await user.save();
      res.status(200).json({
        message: "Added to cart successfully",
        user,
      });
    } catch (error) {
      next();
    }
  }
  public static async removecart(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { productId, variantId } = req.params;
      const user = await usermodel.findById(req.user?._id);
      if (!user) {
        return next(new Errorhandler(404, "User not found"));
      }
      user.cart = user.cart.filter(
        (c) =>
          c.productId.toString() !== productId.toString() &&
          c.variantId.toString() !== variantId.toString()
      );
      await user.save();
      res.status(200).json({
        message: "Removed cart succcessfully",
      });
    } catch (error) {
      next();
    }
  }
  public static async categories(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const categories = await Product.aggregate([
        {
          $group: {
            _id: null,
            uniqueCategories: { $addToSet: "$category" }, // Collecting unique categories
          },
        },
        {
          $project: {
            _id: 0,
            categories: "$uniqueCategories", // Rename 'uniqueCategories' to 'categories'
          },
        },
      ]);

      res.status(200).json({
        message: "Fetched categories successfully",
        categories: categories.length > 0 ? categories[0].categories : [],
      });
    } catch (error) {
      next(error);
    }
  }
  public static async AddRating(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const customerId = req.user?._id as Schema.Types.ObjectId;
      // const customerId ="66e0139e7f59c516d80a3283" as unknown as Schema.Types.ObjectId;
      const { comment, rating } = req.body;
      const { productId } = req.params;
      const product = await Product.findById(productId);
      console.log("this is a files req.files,", req.files);
      console.log("this is a files req.body,", req.body);
      if (!product) {
        return next(new Errorhandler(404, "Product not found"));
      }
      if (req.files === undefined || !req.files) {
        return next(new Errorhandler(404, "images is required"));
      }
      const uploader = async (path: string) => await UploadOnCloudinary(path);
      if (!Array.isArray(req.files)) {
        return next(new Errorhandler(404, "images is required"));
      }
      const images: IReviewImage[] = [];
      req.files.forEach(async (file, index) => {
        const { buffer } = file;
        const result = await uploader(
          `data:image/png;base64,${buffer.toString("base64")}`
        );
        images.push({
          url: result?.secure_url ? result.secure_url : "",
          description: req.body[`description[${index}]`]
            ? req.body[`description[${index}]`]
            : "",
          createdAt: new Date(),
        });
      });
      product.reviews.push({
        customerId,
        comment,
        rating,
        images,
        createdAt: new Date(),
      } as IProductReview);
      await product.save();
      res.status(200).json({
        message: "Your comment added successfully",
        product,
      });
    } catch (error) {}
  }
}
export default ProductController;
