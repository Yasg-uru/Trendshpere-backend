import { NextFunction, Request, Response } from "express";
import Errorhandler from "../util/Errorhandler.util";
import { reqwithuser } from "../middleware/auth.middleware";
import razorpay from "../config/razorpay.config";
import Order from "../model/order.model";
class ordercontroller {
  private static calculateDiscountPrice(couponCode: string, products: any) {
    let DiscountAmount = 0;

    if (couponCode === process.env.COUPON_CODE) {
      DiscountAmount = process.env.COUPON_DISCOUNT
        ? parseInt(process.env.COUPON_DISCOUNT)
        : 0;
    }
    return products.map((product: any) => {
      const discount = DiscountAmount * product.priceAtPurchase;

      return {
        ...product,
        discount,
      };
    });
  }
  public static async createOrder(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const user = req.user?._id;
      const {
        products,
        shippingDetails,
        couponCode,
        loyaltyPointsUsed,
        isGiftOrder,
        giftMessage,
      } = req.body;
      if (couponCode !== process.env.COUPON_CODE) {
        return next(new Errorhandler(400, "Please Enter Correct Coupon Code"));
      }
      const updatedproducts = this.calculateDiscountPrice(couponCode, products);
      let totalAmount = 0;
      let discountAmount = 0;
      updatedproducts.forEach((product: any) => {
        totalAmount += product.priceAtPurchase * product.quantity;
        discountAmount += product.discount * product.quantity;
      });
      const taxRate = 0.1;
      const taxAmount = totalAmount * taxRate;
      const finalAmount = totalAmount - discountAmount + taxAmount;
      const razorpayOrder = await razorpay.orders.create({
        amount: finalAmount * 100,
        currency: "INR",
        receipt: `receipt_${Date.now()}`,
        payment_capture: true,
      });
      const newOrder = new Order({
        user,
        products: updatedproducts.map(
          (product: {
            productId: any;
            variantId: any;
            quantity: any;
            priceAtPurchase: any;
            discount: any;
          }) => ({
            productId: product.productId,
            variantId: product.variantId,
            quantity: product.quantity,
            priceAtPurchase: product.priceAtPurchase,
            discount: product.discount,
          })
        ),
        totalAmount,
        discountAmount,
        couponCode,
        taxAmount,
        finalAmount,
        shippingDetails,
        payment: {
          paymentId: razorpayOrder.id, // Razorpay order ID
          provider: "Razorpay", // Payment provider is Razorpay
          paymentMethod: "pending", // Payment method will be set after user payment
          paymentStatus: "pending", // Status is pending until the payment is confirmed
        },
        orderStatus: "pending",
        loyaltyPointsUsed,
        isGiftOrder,
        giftMessage,
        auditLog: [
          {
            action: "order_created",
            actor: user,
            timestamp: new Date(),
            description: "Order created successfully.",
          },
        ],
      });

      await newOrder.save();

      // **Step 3: Respond with Razorpay order details**
      res.status(201).json({
        success: true,
        message: "Order created successfully. Proceed with payment.",
        order: newOrder,
        razorpayOrder,
      });
    } catch (error) {}
  }
}
