import { NextFunction, Request, Response } from "express";
import Errorhandler from "../util/Errorhandler.util";
import { reqwithuser } from "../middleware/auth.middleware";
import crypto from "crypto";

import Ordermodel from "../model/order.model";
import Razorpay from "razorpay";
const razorpay = new Razorpay({
  key_id: "rzp_live_tK7jKIBkQuTeH7",
  key_secret: "d3q0tkLxfFVKoizPqeboYYsm",
});

const calculateDiscountPrice = (couponCode: string, products: any) => {
  let discountPercentage = 0;

  if (couponCode === "SPRING2024") {
    discountPercentage = 0.1;
  }
  return products.map((product: any) => {
    const discountByCoupon =
      (discountPercentage / 100) * product.priceAtPurchase;

    return {
      ...product,
      discountByCoupon,
    };
  });
};
export const createOrder = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
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
    if (couponCode !== "SPRING2024") {
      return next(new Errorhandler(400, "Please Enter Correct Coupon Code"));
    }
    const updatedproducts = calculateDiscountPrice(couponCode, products);
    let totalAmount = 0;
    let discountAmount = 0;
    updatedproducts.forEach((product: any) => {
      totalAmount += product.priceAtPurchase * product.quantity;
      discountAmount += product.discount * product.quantity;
    });
    const taxRate = 0.1;
    const taxAmount = totalAmount * taxRate;
    const finalAmount = Math.floor(totalAmount - discountAmount + taxAmount);
    const razorpayOrder = await razorpay.orders.create({
      amount: parseInt(finalAmount.toString()) * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: true,
    });
    const newOrder = new Ordermodel({
      user,
      products: updatedproducts.map(
        (product: {
          productId: any;
          variantId: any;
          quantity: any;
          priceAtPurchase: any;
          discount: any;
          discountByCoupon: any;
        }) => ({
          productId: product.productId,
          variantId: product.variantId,
          quantity: product.quantity,
          priceAtPurchase: product.priceAtPurchase,
          discount: product.discount,
          discountByCoupon: product.discountByCoupon,
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
    const paymentGatewayResponse = await razorpay.payments.fetch(
      razorpayOrder.id
    );

    // Step 5: Handle payment status
    if (paymentGatewayResponse.status === "captured") {
      // Payment successful
      newOrder.payment.paymentStatus = "completed";
      newOrder.payment.paymentId = paymentGatewayResponse.id;
      newOrder.payment.paymentDate = new Date();
      newOrder.orderStatus = "processing";
    } else if (paymentGatewayResponse.status === "failed") {
      // Payment failed (insufficient funds, etc.)
      newOrder.payment.paymentStatus = "failed";
      newOrder.orderStatus = "cancelled";
    }
    await newOrder.save();

    // **Step 3: Respond with Razorpay order details**
    res.status(201).json({
      success: true,
      message: "Order created successfully. Proceed with payment.",
      order: newOrder,
      razorpayOrder,
    });
  } catch (error) {
    console.log("ths is a error message ,", error);
  }
};
export const VerifyPayment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;
    const generatedSignature = crypto
      .createHmac("sha256", "d3q0tkLxfFVKoizPqeboYYsm") // Replace this with your Razorpay secret key
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");
    if (razorpay_signature !== generatedSignature) {
      return next(
        new Errorhandler(400, "Payment verification failed. Invalid signature.")
      );
    }
    const order = await Ordermodel.findOne({
      "payment.paymentId": razorpay_order_id,
    });
    if (!order) {
      return next(new Errorhandler(404, "Order not found "));
    }
    order.payment.paymentStatus = "completed";
    order.payment.paymentDate = new Date();
    order.payment.paymentMethod = "Razorpay";
    order.orderStatus = "processing";
    order.auditLog.push({
      action: "payment_verified",
      actor: order.user,
      timestamp: new Date(),
      description: "Payment successfully verified.",
    });
    order.save();

    res.status(200).json({
      success: true,
      message: "Payment successfully verified and order updated.",
      order,
    });
  } catch (error) {
    return next(
      new Errorhandler(500, "An Error occured while verifying payment")
    );
  }
};
