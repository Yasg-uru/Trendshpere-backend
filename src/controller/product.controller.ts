import { NextFunction, Request, Response } from "express";
import catchAsync from "../middleware/catchasync.middleware";
import {
  IProductReview,
  IReviewImage,
  Product,
  ProductDiscount,
} from "../model/product.model";
import Errorhandler from "../util/Errorhandler.util";
import usermodel from "../model/usermodel";
import { reqwithuser } from "../middleware/auth.middleware";
import { Schema, Types } from "mongoose";
import mongoose from "mongoose";
import UploadOnCloudinary from "../util/cloudinary.util";
import productService from "../services/product.service";
import { MongoMissingDependencyError } from "mongodb";
class ProductController {
  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        name,
        category,
        subcategory,
        childcategory,
        description,
        basePrice,
        materials,
        sustainabilityRating,
        available,
        brand,
        defaultImage,
        variants,
        discount,
        highlights,
        loyalityPoints,
        returnPolicy,
        replacementPolicy,
        productDetails,
      } = req.body;

      // Check if the product already exists
      const existingProduct = await Product.findOne({ name, category });
      if (existingProduct) {
        return res.status(400).json({ message: "Product already exists" });
      }

      // Create a new product
      const newProduct = new Product({
        name,
        category,
        subcategory,
        childcategory,
        description,
        basePrice,
        materials,
        sustainabilityRating,
        available,
        brand,
        defaultImage,
        variants,
        discount,
        highlights,
        loyalityPoints,
        returnPolicy,
        replcementPolicy: replacementPolicy, // fixed spelling here
        productDetails: new Map(Object.entries(productDetails)), // Assuming the input is an object
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
  public static async Addcart(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      console.log("add cart method is called :", req.body);
      const { productId, variantId, size, quantity } = req.body;
      const user = await usermodel.findById(req.user?._id);
      if (!user) {
        return next(new Errorhandler(404, "User not found "));
      }
      console.log("this is user :", user);
      const isAlreadyExist = user.cart.find(
        (cart) =>
          cart.productId.toString() === productId.toString() &&
          cart.variantId.toString() === variantId.toString()
      );
      if (isAlreadyExist) {
        return next(new Errorhandler(400, "Already Exist in the cart "));
      }
      user.cart.push({
        productId: productId as unknown as Schema.Types.ObjectId,
        variantId: variantId as unknown as Schema.Types.ObjectId,
        quantity,
        size,
      });
      await user.save();
      res.status(201).json({
        message: "Added to cart successfully",
        user,
      });
    } catch (error) {
      console.log("this is error :", error);
      next(error);
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
  public static async updateCartQuantity(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { quantity, variantId, productId } = req.body;

      const userId = req.user?._id;
      const user = await usermodel.findById(userId);
      if (!user) {
        return next(new Errorhandler(404, "User not found "));
      }
      const cart = user.cart.find(
        (cart) =>
          cart.productId.toString() === productId.toString() &&
          cart.variantId.toString() === variantId.toString()
      );

      if (cart) {
        cart.quantity = quantity;
      }
      await user.save();
      res.status(200).json({
        message: "updated quantity Successfully",
      });
    } catch (error) {
      console.log("this is a error :", error);
      next(error);
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
      // const customerId = req.user?._id as Schema.Types.ObjectId;
      const customerId =
        "66e0139e7f59c516d80a3283" as unknown as Schema.Types.ObjectId;
      const { comment, rating } = req.body;
      const { productId } = req.params;
      const product = await Product.findById(productId);

      console.log("this is a files req.files,", req.files);
      console.log("this is a files req.body,", req.body);

      if (!product) {
        return next(new Errorhandler(404, "Product not found"));
      }

      if (!req.files || !Array.isArray(req.files)) {
        return next(new Errorhandler(400, "Images are required"));
      }

      const uploader = async (file: Express.Multer.File) =>
        await UploadOnCloudinary(file.path);

      const imagePromises = (req.files as Express.Multer.File[]).map(
        async (file, index) => {
          try {
            const result = await uploader(file);
            return {
              url: result?.secure_url || "",
              description: req.body[`description[${index}]`] || "",
              createdAt: new Date(),
            };
          } catch (error) {
            console.error(`Error uploading file ${file.originalname}:`, error);
            return null;
          }
        }
      );

      // Wait for all images to be processed
      const images = (await Promise.all(imagePromises)).filter(Boolean);

      product.reviews.push({
        customerId,
        comment,
        rating,
        images,
        createdAt: new Date(),
      } as IProductReview);

      await product.save();

      const calculatedAverageRating = productService.calculateAverage(
        product.reviews
      );
      product.rating = calculatedAverageRating;
      await product.save();

      res.status(200).json({
        message: "Your comment added successfully",
        product,
      });
    } catch (error) {
      console.error("Error in AddRating:", error);
      next(new Errorhandler(500, "Internal Server Error"));
    }
  }
  public static async searchProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { searchQuery } = req.query;
      if (!searchQuery) {
        return next(new Errorhandler(404, "please enter query"));
      }
      const products = await Product.find({
        $text: { $search: searchQuery.toString() },
      }).exec();
      res.status(200).json({
        success: true,
        message: "fetched your searched results",
        products,
      });
    } catch (error) {
      next();
    }
  }

  public static async Filter(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        category,
        subcategory,
        childcategory,

        discount,
        minPrice,
        maxPrice,
        available,
        brands,
        colors,
        sizes,
        minRating,
        materials,
      } = req.query;

      const filters: any = {};
      console.log("query", req.query);

      if (subcategory) filters.subcategory = subcategory;
      if (childcategory) filters.childcategory = childcategory;
      if (category) {
        filters.category = { $in: category };
      }
      if (discount === "true") {
        filters.discount = { $exists: true }; // Corrected from $exist to $exists
      }
      if (materials) {
        filters.materials = { $in: materials };
      }
      if (colors) {
        filters["variants.color"] = { $in: colors };
      }
      if (sizes) {
        filters["variants.size"] = { $in: sizes };
      }
      if (brands) {
        filters.brands = { $in: brands };
      }
      if (minRating !== "0" && minRating) {
        filters.sustainabilityRating = { $gte: Number(minRating) };
      }
      if (available === "true") {
        filters.available = true;
      }

      if (minPrice || maxPrice) {
        filters.basePrice = {};
        if (minPrice) {
          filters.basePrice.$gte = Number(minPrice);
        }
        if (maxPrice) {
          filters.basePrice.$lte = Number(maxPrice);
        }
      }

      // Fetch products based on filters
      const products = await Product.find(filters);

      // Send response
      res.status(200).json({
        message: "Applied Filters successfully",
        products,
      });
    } catch (error) {
      // Handle error
      console.error("Error filtering products:", error);
      next();
    }
  }
  public static async createDiscount(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { productId } = req.params;
      const product = await Product.findById(productId);
      if (!product) {
        return next(new Errorhandler(404, "Product not found "));
      }
      if (product.discount) {
        return next(
          new Errorhandler(
            400,
            "Already Discount is Exist for this product,You can update this product discount"
          )
        );
      }
      const { discountPercentage, validFrom, validUntil } = req.body;
      const Discount = new ProductDiscount({
        discountPercentage,
        validFrom,
        validUntil,
      });
      // await Discount.save();

      product.discount = Discount;
      await product.save();
      res.status(201).json({
        message: "Created Discount to the product successfully",
        Discount,
        product,
      });
    } catch (error) {
      next();
    }
  }
  public static async updateDiscount(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { discountId, productId } = req.params;
      const { discountPercentage, validFrom, validUntil } = req.body;
      const product = await Product.findById(productId);
      if (!product) {
        return next(new Errorhandler(404, "product Not found "));
      }
      if (!product.discount) {
        return next(
          new Errorhandler(
            400,
            "You can't update discount because discount is't exist"
          )
        );
      }
      //after that we need to find the discount and update the neccessary details that user wants

      product.discount.discountPercentage =
        discountPercentage || product.discount.discountPercentage;
      product.discount.validUntil = validUntil || product.discount.validUntil;
      product.discount.validFrom = validFrom || product.discount.validFrom;
      await product.save();
      res.status(200).json({
        message: "Product discount updpated successfully",
        product,
      });
    } catch (error) {
      next();
    }
  }
  public static async removeDiscount(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { productId } = req.params;
      const product = await Product.findById(productId);
      if (!product) {
        return next(new Errorhandler(404, "Product Not found"));
      }
      product.discount = undefined;
      await product.save();
      res.status(200).json({
        message: "Removed Discount successfully from the product",
        product,
      });
    } catch (error) {
      next();
    }
  }
  public static async WishList(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { productId } = req.body;
      const userId = req.user?._id;
      const user = await usermodel.findById(userId);
      if (!user) {
        return next(new Errorhandler(404, "User not found "));
      }
      user.wishlist.push(productId as Schema.Types.ObjectId);
      await user.save();
      res.status(200).json({
        message: "Product Added to your wishlist",
      });
    } catch (error) {
      next();
    }
  }
  public static async removeWishListItem(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { productId } = req.params;
      const userId = req.user?._id;
      const user = await usermodel.findById(userId);
      if (!user) {
        return next(new Errorhandler(404, "User not found "));
      }
      user.wishlist = user.wishlist.filter(
        (list) => list.toString() !== productId.toString()
      );
      await user.save();
      res.status(200).json({
        message: "removed product from wishlist",
      });
    } catch (error) {
      next();
    }
  }
  public static async GetWishLists(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?._id;
      const user = await usermodel.findById(userId).populate("wishlist");
      if (!user) {
        return next(new Errorhandler(404, "User not found "));
      }
      res.status(200).json({
        message: "successfully fetcched your wishlist",
      });
    } catch (error) {
      next();
    }
  }
  public static async GetHierarchicalCategories(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const categories = await Product.aggregate([
        {
          // Grouping by category
          $group: {
            _id: "$category",
            subcategories: {
              $addToSet: {
                subcategory: "$subcategory",
                childcategory: "$childcategory",
              },
            },
          },
        },
        {
          // Unwind subcategories to group by category and subcategory
          $unwind: "$subcategories",
        },
        {
          // Grouping by category and subcategory
          $group: {
            _id: {
              category: "$_id",
              subcategory: "$subcategories.subcategory",
            },
            childcategories: {
              $addToSet: "$subcategories.childcategory",
            },
          },
        },
        {
          // Grouping by category
          $group: {
            _id: "$_id.category",
            subcategories: {
              $addToSet: {
                subcategory: "$_id.subcategory",
                childcategories: "$childcategories",
              },
            },
          },
        },
        {
          // Sorting categories alphabetically for consistency
          $sort: {
            _id: 1,
          },
        },
        {
          // Optional projection to format the result neatly
          $project: {
            _id: 0,
            category: "$_id",
            subcategories: {
              $map: {
                input: "$subcategories",
                as: "subcategory",
                in: {
                  subcategory: "$$subcategory.subcategory",
                  childcategories: "$$subcategory.childcategories",
                },
              },
            },
          },
        },
      ]);
      res.status(200).json({
        message: "Fetched successfully your categories in hierarchical format",
        categories,
      });
    } catch (error) {
      next();
    }
  }
  public static async getSingleProduct(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { productId } = req.params;
      const product = await Product.findById(productId);
      if (!product) {
        return next(new Errorhandler(404, "product not found"));
      }
      res.status(200).json({
        product,
      });
    } catch (error) {
      next(error);
    }
  }
  public static async GetProductsByIds(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { productsIds } = req.body;
      const products = await Product.find({ _id: { $in: productsIds } });
      res.status(200).json({
        message: "Fetched successfullt products by the ids",
        products,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default ProductController;
