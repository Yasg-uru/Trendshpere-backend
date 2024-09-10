import mongoose, { Schema, Document } from "mongoose";

// Base Interface for Product
interface IProduct extends Document {
  name: string;
  category: string; // General product category like 't-shirt', 'pants', etc.
  description: string; // Detailed description of the product
  basePrice: number; // Base price for the product before variant-specific adjustments
  materials: string[]; // Array of materials like Cotton, Polyester, etc.
  sustainabilityRating: number; // Eco-friendly rating (out of 5, for example)
  available: boolean; // Base product availability
  brand: string; // Brand name of the product
  overallStock: number; // Overall stock availability based on variants
  defaultImage: string; // Default image for the product
  variants: IProductVariant[]; // Array of product variants
  reviews: IProductReview[]; // Customer reviews
  rating: number; // Average rating for the product
  discount?: IProductDiscount; // Optional discount structure
  calculateOverallStock:()=>void;
  //   specificDetails?: IProductDetails;
}
// interface IProductDetails extends Document {
//   lapelType?: string; // Notched, Peak, Shawl, etc.
//   buttonStyle?: string; // Single-breasted, Double-breasted, etc.
//   liningMaterial?: string; // Satin, Polyester, etc.
//   pocketDetails?: string; // Pocket style or number of pockets
//   ventStyle?: string; // Single, Double, or None
// }
// Interface for Product Variants
interface IProductVariant extends Document {
  size: string; // Variant size, e.g., S, M, L, XL
  color: string; // Variant color, e.g., Red, Blue, Black
  material: string; // Material specific to the variant, e.g., Cotton
  price: number; // Price of the specific variant (can differ from base price)
  stock: number; // Stock availability for this variant
  sku: string; // Unique SKU for this specific variant
  images: string[]; // Array of images for the variant
  available: boolean; // Availability for the specific variant
}

// Interface for Customer Reviews
interface IProductReview extends Document {
  customerId: Schema.Types.ObjectId; // Reference to the customer who left the review
  comment: string; // Review comment
  rating: number; // Rating given (out of 5)
  createdAt: Date; // Date when the review was written
}

// Interface for Discounts
interface IProductDiscount extends Document {
  discountPercentage: number; // Percentage discount (e.g., 10%)
  validFrom: Date; // Date when the discount starts
  validUntil: Date; // Date when the discount ends
}

// Schema for Product Reviews
const productReviewSchema: Schema = new Schema({
  customerId: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
  comment: { type: String, required: true },
  rating: { type: Number, min: 0, max: 5, required: true },
  createdAt: { type: Date, default: Date.now },
});

// Schema for Product Discount
const productDiscountSchema: Schema = new Schema({
  discountPercentage: { type: Number, required: true },
  validFrom: { type: Date, required: true },
  validUntil: { type: Date, required: true },
});

// Schema for Product Variants
const productVariantSchema: Schema = new Schema({
  size: { type: String, required: true },
  color: { type: String, required: true },
  material: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, required: true },
  sku: { type: String, required: true },
  images: { type: [String], required: true }, // Array of images specific to the variant
  available: { type: Boolean, required: true },
});

// Main Product Schema
const productSchema: Schema = new Schema({
  name: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  basePrice: { type: Number, required: true }, // Base price before any variant-specific pricing
  materials: { type: [String], required: true },
  sustainabilityRating: { type: Number, min: 0, max: 5, default: 0 },
  available: { type: Boolean, default: true }, // Availability for the base product
  brand: { type: String, required: true },
  overallStock: { type: Number, default: 0 }, // Automatically calculated based on variant stock
  defaultImage: { type: String, required: true }, // Main product image
  variants: [productVariantSchema], // Embedded schema for product variants
  reviews: [productReviewSchema], // Array of customer reviews
  rating: { type: Number, min: 0, max: 5, default: 0 }, // Average product rating
  discount: { type: productDiscountSchema }, // Optional discount schema
});

// Functionality for calculating overall stock from variants
productSchema.methods.calculateOverallStock = function ():void {
  this.overallStock = this.variants.reduce(
    (total: number, variant: IProductVariant) => total + variant.stock,
    0
  );
};

// Functionality to check if a product or variant is available
productSchema.methods.isProductAvailable = function () {
  // A product is available if any of its variants are available
  return this.variants.some((variant: IProductVariant) => variant.available);
};

// Models
export const Product = mongoose.model<IProduct>("Product", productSchema);
export const ProductVariant = mongoose.model<IProductVariant>(
  "ProductVariant",
  productVariantSchema
);
export const ProductReview = mongoose.model<IProductReview>(
  "ProductReview",
  productReviewSchema
);
export const ProductDiscount = mongoose.model<IProductDiscount>(
  "ProductDiscount",
  productDiscountSchema
);
