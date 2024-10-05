"use strict";
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
const product_model_1 = require("../model/product.model");
const Errorhandler_util_1 = __importDefault(require("../util/Errorhandler.util"));
const usermodel_1 = __importDefault(require("../model/usermodel"));
const cloudinary_util_1 = __importDefault(require("../util/cloudinary.util"));
const product_service_1 = __importDefault(require("../services/product.service"));
class ProductController {
    static create(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { name, category, subcategory, childcategory, description, basePrice, materials, sustainabilityRating, available, brand, defaultImage, variants, discount, highlights, loyalityPoints, returnPolicy, replacementPolicy, productDetails, } = req.body;
                // Check if the product already exists
                const existingProduct = yield product_model_1.Product.findOne({ name, category });
                if (existingProduct) {
                    return res.status(400).json({ message: "Product already exists" });
                }
                // Create a new product
                const newProduct = new product_model_1.Product({
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
                const savedProduct = yield newProduct.save();
                return res.status(201).json({
                    message: "Product created successfully",
                    product: savedProduct,
                });
            }
            catch (error) {
                console.error(error);
                return res.status(500).json({ message: "Server error" });
            }
        });
    }
    static update(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const productId = req.params.id;
                const { name, category, description, basePrice, materials, sustainabilityRating, available, brand, defaultImage, variants, discount, } = req.body;
                // Find the product by ID
                const product = yield product_model_1.Product.findById(productId);
                if (!product) {
                    return res.status(404).json({ message: "Product not found" });
                }
                // Update the product fields
                if (name !== undefined)
                    product.name = name;
                if (category !== undefined)
                    product.category = category;
                if (description !== undefined)
                    product.description = description;
                if (basePrice !== undefined)
                    product.basePrice = basePrice;
                if (materials !== undefined)
                    product.materials = materials;
                if (sustainabilityRating !== undefined)
                    product.sustainabilityRating = sustainabilityRating;
                if (available !== undefined)
                    product.available = available;
                if (brand !== undefined)
                    product.brand = brand;
                if (defaultImage !== undefined)
                    product.defaultImage = defaultImage;
                if (variants !== undefined) {
                    product.variants = variants; // Handle updating of variants
                    product.calculateOverallStock(); // Recalculate stock after updating variants
                }
                if (discount !== undefined)
                    product.discount = discount;
                // Save the updated product
                const updatedProduct = yield product.save();
                return res.status(200).json({
                    message: "Product updated successfully",
                    product: updatedProduct,
                });
            }
            catch (error) {
                console.error(error);
                next();
            }
        });
    }
    static delete(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                const product = yield product_model_1.Product.findById(productId);
                if (!product) {
                    return next(new Errorhandler_util_1.default(404, "Product Not found"));
                }
                res.status(200).json({
                    message: "product deleted successfully",
                });
            }
            catch (error) {
                next();
            }
        });
    }
    static Addcart(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                console.log("add cart method is called :", req.body);
                const { productId, variantId, size, quantity } = req.body;
                const user = yield usermodel_1.default.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
                if (!user) {
                    return next(new Errorhandler_util_1.default(404, "User not found "));
                }
                console.log("this is user :", user);
                const isAlreadyExist = user.cart.find((cart) => cart.productId.toString() === productId.toString() &&
                    cart.variantId.toString() === variantId.toString());
                if (isAlreadyExist) {
                    return next(new Errorhandler_util_1.default(400, "Already Exist in the cart "));
                }
                user.cart.push({
                    productId: productId,
                    variantId: variantId,
                    quantity,
                    size,
                });
                yield user.save();
                res.status(201).json({
                    message: "Added to cart successfully",
                    user,
                });
            }
            catch (error) {
                console.log("this is error :", error);
                next(error);
            }
        });
    }
    static removecart(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { productId, variantId } = req.params;
                const user = yield usermodel_1.default.findById((_a = req.user) === null || _a === void 0 ? void 0 : _a._id);
                if (!user) {
                    return next(new Errorhandler_util_1.default(404, "User not found"));
                }
                user.cart = user.cart.filter((c) => c.productId.toString() !== productId.toString() &&
                    c.variantId.toString() !== variantId.toString());
                yield user.save();
                res.status(200).json({
                    message: "Removed cart succcessfully",
                });
            }
            catch (error) {
                next();
            }
        });
    }
    static updateCartQuantity(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { quantity, variantId, productId } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
                const user = yield usermodel_1.default.findById(userId);
                if (!user) {
                    return next(new Errorhandler_util_1.default(404, "User not found "));
                }
                const cart = user.cart.find((cart) => cart.productId.toString() === productId.toString() &&
                    cart.variantId.toString() === variantId.toString());
                if (cart) {
                    cart.quantity = quantity;
                }
                yield user.save();
                res.status(200).json({
                    message: "updated quantity Successfully",
                });
            }
            catch (error) {
                console.log("this is a error :", error);
                next(error);
            }
        });
    }
    static categories(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const categories = yield product_model_1.Product.aggregate([
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
            }
            catch (error) {
                next(error);
            }
        });
    }
    static Helpfulcount(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { reviewId, productId } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
                const product = yield product_model_1.Product.findById(productId);
                if (!product) {
                    return next(new Errorhandler_util_1.default(404, "product not found "));
                }
                const review = product.reviews.find((r) => r._id.toString() === reviewId.toString());
                if (!review) {
                    return next(new Errorhandler_util_1.default(404, "Review not found"));
                }
                review.helpfulCount += 1;
                review.helpfulcountgivenBy.push(userId);
                yield product.save();
                res.status(200).json({
                    message: "Added your helpful count ",
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    static AddRating(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { comment, rating } = req.body;
                const { productId } = req.params;
                const product = yield product_model_1.Product.findById(productId);
                console.log("this is a files req.files,", req.files);
                console.log("this is a files req.body,", req.body);
                if (!product) {
                    return next(new Errorhandler_util_1.default(404, "Product not found"));
                }
                if (!req.files || !Array.isArray(req.files)) {
                    return next(new Errorhandler_util_1.default(400, "Images are required"));
                }
                const uploader = (file) => __awaiter(this, void 0, void 0, function* () { return yield (0, cloudinary_util_1.default)(file.path); });
                const imagePromises = req.files.map((file, index) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const result = yield uploader(file);
                        return {
                            url: (result === null || result === void 0 ? void 0 : result.secure_url) || "",
                            description: req.body[`description[${index}]`] || "",
                            createdAt: new Date(),
                        };
                    }
                    catch (error) {
                        console.error(`Error uploading file ${file.originalname}:`, error);
                        return null;
                    }
                }));
                // Wait for all images to be processed
                const images = (yield Promise.all(imagePromises)).filter(Boolean);
                product.reviews.push({
                    customerId: (_a = req.user) === null || _a === void 0 ? void 0 : _a._id,
                    comment,
                    rating,
                    images,
                    createdAt: new Date(),
                });
                yield product.save();
                const calculatedAverageRating = product_service_1.default.calculateAverage(product.reviews);
                product.rating = calculatedAverageRating;
                yield product.save();
                res.status(200).json({
                    message: "Your comment added successfully",
                    product,
                });
            }
            catch (error) {
                console.error("Error in AddRating:", error);
                next(new Errorhandler_util_1.default(500, "Internal Server Error"));
            }
        });
    }
    static searchProduct(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { searchQuery } = req.query;
                if (!searchQuery) {
                    return next(new Errorhandler_util_1.default(404, "please enter query"));
                }
                const products = yield product_model_1.Product.find({
                    $text: { $search: searchQuery.toString() },
                }).exec();
                res.status(200).json({
                    success: true,
                    message: "fetched your searched results",
                    products,
                });
            }
            catch (error) {
                next();
            }
        });
    }
    static Filter(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { category, subcategory, childcategory, discount, minPrice, maxPrice, available, brands, colors, sizes, minRating, materials, } = req.query;
                const filters = {};
                console.log("query", req.query);
                if (subcategory)
                    filters.subcategory = subcategory;
                if (childcategory)
                    filters.childcategory = childcategory;
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
                const products = yield product_model_1.Product.find(filters);
                // Send response
                res.status(200).json({
                    message: "Applied Filters successfully",
                    products,
                });
            }
            catch (error) {
                // Handle error
                console.error("Error filtering products:", error);
                next();
            }
        });
    }
    static createDiscount(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                const product = yield product_model_1.Product.findById(productId);
                if (!product) {
                    return next(new Errorhandler_util_1.default(404, "Product not found "));
                }
                if (product.discount) {
                    return next(new Errorhandler_util_1.default(400, "Already Discount is Exist for this product,You can update this product discount"));
                }
                const { discountPercentage, validFrom, validUntil } = req.body;
                const Discount = new product_model_1.ProductDiscount({
                    discountPercentage,
                    validFrom,
                    validUntil,
                });
                // await Discount.save();
                product.discount = Discount;
                yield product.save();
                res.status(201).json({
                    message: "Created Discount to the product successfully",
                    Discount,
                    product,
                });
            }
            catch (error) {
                next();
            }
        });
    }
    static updateDiscount(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { discountId, productId } = req.params;
                const { discountPercentage, validFrom, validUntil } = req.body;
                const product = yield product_model_1.Product.findById(productId);
                if (!product) {
                    return next(new Errorhandler_util_1.default(404, "product Not found "));
                }
                if (!product.discount) {
                    return next(new Errorhandler_util_1.default(400, "You can't update discount because discount is't exist"));
                }
                //after that we need to find the discount and update the neccessary details that user wants
                product.discount.discountPercentage =
                    discountPercentage || product.discount.discountPercentage;
                product.discount.validUntil = validUntil || product.discount.validUntil;
                product.discount.validFrom = validFrom || product.discount.validFrom;
                yield product.save();
                res.status(200).json({
                    message: "Product discount updpated successfully",
                    product,
                });
            }
            catch (error) {
                next();
            }
        });
    }
    static removeDiscount(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                const product = yield product_model_1.Product.findById(productId);
                if (!product) {
                    return next(new Errorhandler_util_1.default(404, "Product Not found"));
                }
                product.discount = undefined;
                yield product.save();
                res.status(200).json({
                    message: "Removed Discount successfully from the product",
                    product,
                });
            }
            catch (error) {
                next();
            }
        });
    }
    static WishList(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { productId } = req.body;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
                const user = yield usermodel_1.default.findById(userId);
                if (!user) {
                    return next(new Errorhandler_util_1.default(404, "User not found "));
                }
                user.wishlist.push(productId);
                yield user.save();
                res.status(200).json({
                    message: "Product Added to your wishlist",
                });
            }
            catch (error) {
                next();
            }
        });
    }
    static removeWishListItem(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const { productId } = req.params;
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
                const user = yield usermodel_1.default.findById(userId);
                if (!user) {
                    return next(new Errorhandler_util_1.default(404, "User not found "));
                }
                user.wishlist = user.wishlist.filter((list) => list.toString() !== productId.toString());
                yield user.save();
                res.status(200).json({
                    message: "removed product from wishlist",
                });
            }
            catch (error) {
                next();
            }
        });
    }
    static GetWishLists(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a._id;
                const user = yield usermodel_1.default.findById(userId).populate("wishlist");
                if (!user) {
                    return next(new Errorhandler_util_1.default(404, "User not found "));
                }
                res.status(200).json({
                    message: "successfully fetcched your wishlist",
                });
            }
            catch (error) {
                next();
            }
        });
    }
    static GetHierarchicalCategories(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const categories = yield product_model_1.Product.aggregate([
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
            }
            catch (error) {
                next();
            }
        });
    }
    static getSingleProduct(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productId } = req.params;
                const product = yield product_model_1.Product.findById(productId);
                if (!product) {
                    return next(new Errorhandler_util_1.default(404, "product not found"));
                }
                res.status(200).json({
                    product,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
    static GetProductsByIds(req, res, next) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { productsIds } = req.body;
                console.log("this is req,params ", req.body);
                // const idsArray = (productsIds as string).split(",");
                const products = yield product_model_1.Product.find({ _id: { $in: productsIds } });
                res.status(200).json({
                    message: "Fetched successfullt products by the ids",
                    products,
                });
            }
            catch (error) {
                next(error);
            }
        });
    }
}
exports.default = ProductController;
