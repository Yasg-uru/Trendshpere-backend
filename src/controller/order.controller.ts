import { NextFunction, Request, Response } from "express";
import Errorhandler from "../util/Errorhandler.util";
import { reqwithuser } from "../middleware/auth.middleware";
import crypto from "crypto";

import Ordermodel from "../model/order.model";
import Razorpay from "razorpay";
import { Product } from "../model/product.model";
import usermodel from "../model/usermodel";
// const razorpay = new Razorpay({
//   key_id: "rzp_live_tK7jKIBkQuTeH7",
//   key_secret: "d3q0tkLxfFVKoizPqeboYYsm",
// });
const razorpay = new Razorpay({
  key_id: "rzp_test_7dU2Zk3usqjmRX",
  key_secret: "AtoGFb47DrDC0hdZfXR9dnCi",
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
    // const user = "66e0139e7f59c516d80a3283";
    const user = req.user?._id;
    const {
      products,
      address,
      couponCode,
      loyaltyPointsUsed,
      isGiftOrder,
      deliveryType,
      giftMessage,
    } = req.body;
    console.log("this is a req.body of the create order :", req.body);
    let deliveryCharge: number = 0;
    if (deliveryType === "express") {
      deliveryCharge = 10;
    }
    // if (couponCode !== "SPRING2024") {
    //   return next(new Errorhandler(400, "Please Enter Correct Coupon Code"));
    // }
    const updatedproducts = calculateDiscountPrice(couponCode, products);
    let totalAmount = 0;
    let discountAmount = 0;
    updatedproducts.forEach((product: any) => {
      totalAmount += product.priceAtPurchase * product.quantity;
      discountAmount += product.discount * product.quantity;
    });
    const taxRate = 0.1;
    const taxAmount = totalAmount * taxRate;
    const finalAmount = Math.floor(
      totalAmount - discountAmount + taxAmount + deliveryCharge
    );
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
          size: any;
        }) => ({
          productId: product.productId,
          variantId: product.variantId,
          quantity: product.quantity,
          priceAtPurchase: product.priceAtPurchase,
          discount: product.discount,
          discountByCoupon: product.discountByCoupon,
          size: product.size,
        })
      ),
      totalAmount,
      discountAmount,
      couponCode,
      taxAmount,
      finalAmount,
      address,
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
    const Existinguser = await usermodel.findById(user);
    if (Existinguser) {
      Existinguser.address.push({ ...address });
      await Existinguser.save();
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
    next(error);
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
      .createHmac("sha256", "AtoGFb47DrDC0hdZfXR9dnCi") // Replace this with your Razorpay secret key
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");
    console.log("this is a generated signature :", generatedSignature);
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
    const paymentGatewayResponse = await razorpay.payments.fetch(
      razorpay_payment_id
    );

    // Step 5: Handle payment status
    if (paymentGatewayResponse.status === "captured") {
      // Payment successful
      order.payment.paymentStatus = "completed";
      order.payment.paymentId = paymentGatewayResponse.id;
      order.payment.paymentDate = new Date();
      order.orderStatus = "processing";
    } else if (paymentGatewayResponse.status === "failed") {
      // Payment failed (insufficient funds, etc.)
      order.payment.paymentStatus = "failed";
      order.orderStatus = "cancelled";
    }

    order.save();
    await Promise.all(
      order.products.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (product) {
          const variant = product.variants.find(
            (variant) =>
              (variant._id as string).toString() === item.variantId.toString()
          );

          if (variant) {
            variant.stock -= item.quantity;
            await product.save();
          }
        }
      })
    );
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
export const cancelOrder = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { OrderId, cancelReason } = req.body;
    const userId = req.user?._id;
    const order = await Ordermodel.findById(OrderId).populate(
      "products.product products.variant"
    );
    if (!order) {
      return next(new Errorhandler(404, "Order not found "));
    }
    if (order.user.toString() !== userId) {
      return next(new Errorhandler(400, "Unauthorized Access"));
    }
    if (order.orderStatus === "shipped" || order.orderStatus === "delivered") {
      return next(
        new Errorhandler(
          400,
          "Order cannot be canceled after shipping or delivery"
        )
      );
    }
    order.orderStatus = "cancelled";
    order.cancelReason = cancelReason;
    order.cancellationDate = new Date();
    await Promise.all(
      order.products.map(async (item) => {
        const product = await Product.findById(item.productId);
        if (product) {
          const variant = product.variants.find(
            (variant) =>
              (variant._id as string).toString() === item.variantId.toString()
          );
          if (variant) {
            variant.stock += item.quantity;
            await product.save();
          }
        }
      })
    );
    if (order.payment.paymentStatus === "completed") {
      const refund = await refundPayment(
        order.payment.paymentId,
        order.totalAmount
      );
      if (refund.success) {
        return next(new Errorhandler(400, "Refund Failed"));
      }
      order.payment.paymentStatus = "refunded";
      order.refund = {
        requested: true,
        amount: order.totalAmount,
        status: "completed",
        requestDate: new Date(),
        completionDate: new Date(),
      };
      order.auditLog.push({
        action: "order_cancelled",
        actor: order.user, // Assuming `userId` holds the ID of the user performing the action
        timestamp: new Date(),
        description:
          "Order has been cancelled due to the following reason: " +
          cancelReason,
      });
      await order.save();
    }
    res.status(200).json({
      message: "Order Canceled Successfully",
      order,
    });
  } catch (error) {
    return next(new Errorhandler(500, "Something went wrong"));
  }
};

export const refundPayment = async (paymentId: string, TotalAmount: number) => {
  try {
    const refund = await razorpay.payments.refund(paymentId, {
      amount: TotalAmount * 100, // Razorpay accepts amount in paise (1 INR = 100 paise)
      speed: "normal", // Optional, can be "fast" or "normal"
      notes: {
        reason: "Order cancellation refund",
      },
    });
    return {
      success: true,
      data: refund,
    };
  } catch (error) {
    console.log("Razorpay Error in refund:", error);
    return {
      success: false,
      error: error,
    };
  }
};
// export const replacementItems = async (
//   req: reqwithuser,
//   res: Response,
//   next: NextFunction
// ) => {
//   try {
//     const { orderId, replacmentItems } = req.body;
//     const userId = req.user?._id;
//     const order = await Ordermodel.findById(orderId).populate(
//       "products.product"
//     );
//     if (!order) {
//       return next(new Errorhandler(404, "order not found"));
//     }
//     await Promise.all(
//       replacmentItems.map(async (item) => {
//         const product = await Product.findById();
//       })
//     );
//   } catch (error) {}
// };

export const returnPolicy = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId, returnItems } = req.body;
    const order = await Ordermodel.findById(orderId);
    if (!order) {
      return next(new Errorhandler(404, "order not found "));
    }
    let refundAmount: number = 0;
    await Promise.all(
      returnItems.map(async (item: any) => {
        const product = await Product.findById(item.productId);
        if (product) {
          if (product.returnPolicy.eligible) {
            const currentDate = new Date();
            const purchasedDate = new Date(order.createdAt);
            const refundDaysAllowed = product.returnPolicy.refundDays;
            const timeDifference =
              currentDate.getTime() - purchasedDate.getTime();
            const daysSincePurchase = timeDifference / (1000 * 3600 * 24);
            if (daysSincePurchase <= refundDaysAllowed) {
            }
            const variant = product.variants.find(
              (variant) => variant.toString() === item.variantId.toString()
            );
            if (variant) {
              variant.stock += item.quantity;
              refundAmount +=
                item.priceAtPurchase * item.quantity -
                item.discount * item.quantity;
            }
          }
        }
      })
    );
    if (order.payment.paymentStatus === "completed") {
      const refundResponse = await refundPayment(
        order.payment.paymentId,
        refundAmount
      );
      if (!refundResponse.success) {
        return next(new Errorhandler(400, "Refund Failed"));
      }
      order.payment.paymentStatus = "refunded";
      order.refund = {
        requested: true,
        amount: refundAmount,
        status: "completed",
        requestDate: new Date(),
        completionDate: new Date(),
      };
      order.auditLog.push({
        action: "return_processed",
        actor: order.user,
        timestamp: new Date(),
        description: `Refund of ₹${refundAmount} processed for returned items.`,
      });
      await order.save();
      res.status(200).json({
        success: true,
        message: "Return processed and refund initiated successfully.",
        refundAmount,
        order,
      });
    }
  } catch (error) {}
};

export const FilterOrders = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract filters from query parameters
    const {
      status, // Order status
      productId, // Product ID
      variantId, // Product Variant ID
      paymentStatus, // Payment status
      startDate, // For date range filtering
      endDate,
      couponCode, // Coupon used
      isGiftOrder, // If it's a gift order
      city, // Address city
      country, // Address country
      minTotalAmount, // Minimum order amount
      maxTotalAmount, // Maximum order amount
      page = 1, // Pagination: default page 1
      limit = 10, // Pagination: default limit of 10
      sortBy = "createdAt", // Sorting field (default: createdAt)
      order = "desc", // Sorting order (default: descending)
    } = req.query;

    // Initialize query object for MongoDB
    const query: any = {};
    const user = req.user?._id;
    // Add search conditions dynamically based on query params
    if (user) query.user = user;
    if (status) query.orderStatus = status;
    if (productId) query["products.productId"] = productId;
    if (variantId) query["products.variantId"] = variantId;
    if (paymentStatus) query["payment.paymentStatus"] = paymentStatus;
    if (couponCode) query.couponCode = couponCode;
    if (isGiftOrder) query.isGiftOrder = isGiftOrder === "true"; // Convert string to boolean
    if (city) query["address.city"] = city;
    if (country) query["address.country"] = country;

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate as string);
      if (endDate) query.createdAt.$lte = new Date(endDate as string);
    }

    // Total amount range filter
    if (minTotalAmount || maxTotalAmount) {
      query.totalAmount = {};
      if (minTotalAmount) query.totalAmount.$gte = Number(minTotalAmount);
      if (maxTotalAmount) query.totalAmount.$lte = Number(maxTotalAmount);
    }

    // Pagination and sorting
    const skip = (Number(page) - 1) * Number(limit);
    const sortOptions: any = {};
    sortOptions[sortBy as string] = order === "asc" ? 1 : -1;

    // Execute the search query with pagination and sorting
    const orders = await Ordermodel.find(query)
      .skip(skip)
      .limit(Number(limit))
      .sort(sortOptions);

    // Count total matching documents (without pagination)
    const totalOrders = await Ordermodel.countDocuments(query);

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        totalOrders,
        currentPage: Number(page),
        totalPages: Math.ceil(totalOrders / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    next(new Error("Error fetching orders"));
  }
};
export const searchOrders = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { searchQuery } = req.query;
    if (!searchQuery) {
      return next(new Errorhandler(404, "Please Enter query for search"));
    }
    const user = req.user?._id;
    const orders = await Ordermodel.find({
      user,
      $text: { $search: searchQuery as string },
    });
    res.status(200).json({
      message: "Searched your orders successfully",
      orders,
    });
  } catch (error) {
    next();
  }
};
export const updateOrderStatus = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId, status, cancelReason } = req.body;
    const order = await Ordermodel.findById(orderId);
    if (!order) {
      return next(new Errorhandler(404, "Order not found"));
    }
    if (status === "cancelled") {
      if (order.orderStatus === "delivered") {
        return next(
          new Errorhandler(
            400,
            "You can't cancel order because already order is delivered"
          )
        );
      }
      order.orderStatus = "cancelled";
      order.cancelReason = cancelReason;
      order.cancellationDate = new Date();
      await Promise.all(
        order.products.map(async (item) => {
          const product = await Product.findById(item.productId);
          if (product) {
            const variant = product.variants.find(
              (variant) =>
                (variant._id as string).toString() === item.variantId.toString()
            );
            if (variant) {
              variant.stock += item.quantity;
              await product.save();
            }
          }
        })
      );
      if (order.payment.paymentStatus === "completed") {
        const refund = await refundPayment(
          order.payment.paymentId,
          order.totalAmount
        );
        if (refund.success) {
          return next(new Errorhandler(400, "Refund Failed"));
        }
        order.payment.paymentStatus = "refunded";
        order.refund = {
          requested: true,
          amount: order.totalAmount,
          status: "completed",
          requestDate: new Date(),
          completionDate: new Date(),
        };
        order.auditLog.push({
          action: "order_cancelled",
          actor: order.user, // Assuming `userId` holds the ID of the user performing the action
          timestamp: new Date(),
          description:
            "Order has been cancelled due to the following reason: " +
            cancelReason,
        });
        await order.save();
      }
    }
    order.orderStatus = status;
    await order.save();
    res.status(200).json({
      message: `order ${status} successfully`,
      order,
    });
  } catch (error) {
    next();
  }
};
