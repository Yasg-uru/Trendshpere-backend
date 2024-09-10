import { NextFunction, Request, Response } from "express";
import catchAsync from "../middleware/catchasync.middleware";
import { Product } from "../model/product.model";
import Errorhandler from "../util/Errorhandler.util";
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
}
export default ProductController;
