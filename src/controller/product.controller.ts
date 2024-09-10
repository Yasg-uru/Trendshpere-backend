import { NextFunction, Request, Response } from "express";
import catchAsync from "../middleware/catchasync.middleware";
import { Product } from "../model/product.model";
import Errorhandler from "../util/Errorhandler.util";
import usermodel from "../model/usermodel";
import { reqwithuser } from "../middleware/auth.middleware";
import { Schema } from "mongoose";
import mongoose from "mongoose";
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
}
export default ProductController;
