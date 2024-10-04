import { NextFunction, Request, Response } from "express";
import Errorhandler from "../util/Errorhandler.util";
import { reqwithuser } from "../middleware/auth.middleware";
import crypto from "crypto";

import Ordermodel from "../model/order.model";
import Razorpay from "razorpay";
import { Product } from "../model/product.model";
import usermodel from "../model/usermodel";
import { Schema } from "mongoose";
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
const calculateEarnings=(totalAmount :number,isOntime:boolean)=>{
  if(isOntime){
return totalAmount*0.06;
  }else{
    return totalAmount*0.03;

  }

}
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
    const productWithPolicies = await Promise.all(
      updatedproducts.map(async (product: any) => {
        const productDetails = await Product.findById(product.productId);
        return {
          ...product,
          isReturnable: productDetails?.returnPolicy?.eligible || false,
          isReplaceable: productDetails?.replcementPolicy?.elgible || false,
        };
      })
    );
    productWithPolicies.forEach((product: any) => {
      totalAmount += product.priceAtPurchase * product.quantity;
      discountAmount += product.discount * product.quantity;
    });
    // const taxRate = 0.1;
    const taxAmount = totalAmount;
    // const taxAmount = totalAmount * taxRate;
    const finalAmount = Math.floor(
      totalAmount - discountAmount + deliveryCharge
    );
    const razorpayOrder = await razorpay.orders.create({
      amount: parseInt(finalAmount.toString()) * 100,
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
      payment_capture: true,
    });
    const currentDate = new Date();
    let expectedDeliveryTime;
    if (deliveryType === "express") {
      expectedDeliveryTime = new Date(currentDate);
      expectedDeliveryTime.setDate(currentDate.getDate() + 2); // For express delivery (e.g., 2 days)
    } else {
      expectedDeliveryTime = new Date(currentDate);
      expectedDeliveryTime.setDate(currentDate.getDate() + 5); // For standard delivery (e.g., 5 days)
    }

    const newOrder = new Ordermodel({
      user,
      products: productWithPolicies.map((product: any) => ({
        productId: product.productId,
        variantId: product.variantId,
        quantity: product.quantity,
        size: product.size,
        priceAtPurchase: product.priceAtPurchase,
        discount: product.discount,
        discountByCoupon: product.discountByCoupon,
        isReturnable: product.isReturnable,
        isReplaceable: product.isReplaceable,
      })),
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
      expectedDeliveryTime,
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
      const isExistingAddress = Existinguser.address.some(
        (add) =>
          address.addressLine1 === add.addressLine1 &&
          address.addressLine2 === add.addressLine2 &&
          address.city === add.city &&
          address.state === add.state &&
          address.postalCode === add.postalCode &&
          address.country === add.country &&
          address.country === add.country &&
          address.phone === add.phone &&
          address.type === add.type
      );
      if (!isExistingAddress) {
        Existinguser.address.push(address);
        await Existinguser.save();
      }
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
    // console.log("this is a order cancel controller :", req.body);
    const userId = req.user?._id;
    const order = await Ordermodel.findById(OrderId).populate(
      "products.productId"
    );
    if (!order) {
      return next(new Errorhandler(404, "Order not found "));
    }

    // if (order.user.toString() !== userId.toString()) {
    //   return next(new Errorhandler(400, "Unauthorized Access"));
    // }
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
        order.finalAmount
      );
      console.log("this is a refund data :", refund.data);
      if (!refund.success) {
        return next(new Errorhandler(400, "Refund Failed"));
      }
      order.payment.paymentStatus = "refunded";
      // order.refund = {
      //   requested: true,
      //   amount: order.totalAmount,
      //   status: "completed",
      //   requestDate: new Date(),
      //   completionDate: new Date(),
      // };
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
      message: "Order Cancelled Successfully",
      order,
    });
  } catch (error) {
    console.log("this is a error :", error);
    next(error);
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

export const replacePolicy = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId, replaceItems, reason } = req.body;
    console.log("this is a replacement items req.body for testing :", req.body);
    // Fetch the order by ID

    const order = await Ordermodel.findById(orderId);
    if (!order) {
      return next(new Errorhandler(404, "Order not found"));
    }
    if (
      order.orderStatus === "delivered" ||
      order.orderStatus === "replaced" ||
      order.orderStatus === "returned" ||
      order.orderStatus === "cancelled"
    ) {
      return next(
        new Errorhandler(
          401,
          `You can't able to replace this order becaused this order is already ${order.orderStatus}`
        )
      );
    }
    // Process each item in replaceItems array
    await Promise.all(
      replaceItems.map(async (item: any) => {
        try {
          const product = await Product.findById(item.productId);
          if (!product) {
            // Use `next` to handle the error within an async function
            return next(
              new Errorhandler(
                404,
                `Product with ID ${item.productId} not found`
              )
            );
          }

          // Check if the product is eligible for replacement
          if (product.replcementPolicy.elgible) {
            const currentDate = new Date();
            const purchaseDate = new Date(order.createdAt);
            const replaceDaysAllowed = product.replcementPolicy.replacementDays;
            const timeDifference =
              currentDate.getTime() - purchaseDate.getTime();
            const daysSincePurchase = timeDifference / (1000 * 3600 * 24);

            // Ensure the replacement period is still valid
            if (daysSincePurchase <= replaceDaysAllowed) {
              // Find the ordered product by productId and variantId
              const orderProduct = order.products.find(
                (prod) =>
                  prod.productId.toString() === item.productId.toString() &&
                  prod.variantId.toString() === item.variantId.toString()
              );

              if (!orderProduct) {
                return next(
                  new Errorhandler(
                    404,
                    `Ordered product with variant ID ${item.variantId} not found`
                  )
                );
              }

              // Mark the product as requested for replacement
              orderProduct.replacement = {
                requested: true,
                status: "pending",
                reason,
                requestDate: new Date(),
              };
            } else {
              // Handle cases where the replacement period has passed
              return next(
                new Errorhandler(
                  400,
                  `Replacement period exceeded for product ID ${item.productId}`
                )
              );
            }
          } else {
            // Handle cases where the product is not eligible for replacement
            return next(
              new Errorhandler(
                400,
                `Product with ID ${item.productId} is not eligible for replacement`
              )
            );
          }
        } catch (error) {
          console.error("Error processing replacement for item:", error);
          return next(new Errorhandler(500, "Internal server error"));
        }
      })
    );

    // Audit log for replacement request
    order.auditLog.push({
      action: "replacement_requested",
      actor: order.user,
      timestamp: new Date(),
      description: `Replacement requested for some items.`,
    });
    order.orderStatus = "replaced";
    // Save the updated order
    await order.save();

    // Success response
    res.status(200).json({
      success: true,
      message: "Replacement request initiated successfully",
      order,
    });
  } catch (error) {
    console.error("Error occurred while processing replacement:", error);
    next(
      new Errorhandler(
        500,
        "An error occurred while processing the replacement"
      )
    );
  }
};
export const processReplacement = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { replacementItems, orderId, status } = req.body;
    console.log("this a req.body :", req.body);
    const order = await Ordermodel.findById(orderId);
    if (!order) {
      return next(new Errorhandler(404, "Order not found "));
    }
    console.log("this a order that is finded by the  :", order);
    //after finding the order we need to preform the operations
    await Promise.all(
      replacementItems.map((item: any) => {
        const orderProduct = order.products.find(
          (product) =>
            product.productId.toString() === item.productId.toString() &&
            product.variantId.toString() === item.variantId.toString()
        );
        if (!orderProduct) {
          return next(
            new Errorhandler(
              404,
              `Product with ID ${item.productId} not found in the order`
            )
          );
        }
        if (status === "rejected") {
          if (orderProduct.replacement?.status === "pending") {
            orderProduct.replacement.status = "rejected";
            orderProduct.replacement.responseDate = new Date();
          } else {
            return next(
              new Errorhandler(
                400,
                "Replacement request not in a valid state to be rejected"
              )
            );
          }
        }
        if (status === "approved") {
          if (orderProduct.replacement?.status === "pending") {
            // Mark the replacement request as approved
            orderProduct.replacement.status = "approved";
            orderProduct.replacement.responseDate = new Date();

            // Optionally: Add logic to handle product return from the customer and product replacement shipping
          } else {
            return next(
              new Errorhandler(
                400,
                "Replacement request not in a valid state to be approved"
              )
            );
          }
        }
      })
    );
    order.auditLog.push({
      action: "replacement_status_updated",
      actor: req.user?._id as Schema.Types.ObjectId, // Assuming req.user contains the authenticated user making the change (admin or delivery personnel)
      timestamp: new Date(),
      description: `Replacement ${status} for order ${orderId}`,
    });
    await order.save();
    res.status(200).json({
      success: true,
      message: `Replacement request(s) ${status} successfully`,
      order,
    });
  } catch (error) {
    next(
      new Errorhandler(
        500,
        "An error occurred while processing the replacement"
      )
    );
  }
};
export const returnPolicy = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId, returnItems } = req.body;

    // Find the order by ID
    const order = await Ordermodel.findById(orderId);
    if (!order) {
      return next(new Errorhandler(404, "Order not found"));
    }

    console.log("Return items:", returnItems);

    // Initialize refund details
    let totalRefundAmount: number = 0;

    // Process each return item
    await Promise.all(
      returnItems.map(async (item: any) => {
        try {
          const product = await Product.findById(item.productId);
          if (!product) {
            throw new Errorhandler(
              404,
              `Product with ID ${item.productId} not found`
            );
          }

          if (product.returnPolicy.eligible) {
            const currentDate = new Date();
            const purchasedDate = new Date(order.createdAt);
            const refundDaysAllowed = product.returnPolicy.refundDays;
            const timeDifference =
              currentDate.getTime() - purchasedDate.getTime();
            const daysSincePurchase = timeDifference / (1000 * 3600 * 24);

            if (daysSincePurchase <= refundDaysAllowed) {
              const variant = product.variants.find(
                (variant) =>
                  variant._id.toString() === item.variantId.toString()
              );

              if (!variant) {
                throw new Errorhandler(
                  404,
                  `Variant with ID ${item.variantId} not found`
                );
              }

              // Calculate refund amount
              const calculatedRefund =
                item.priceAtPurchase - item.discount - item.discountByCoupon;
              if (calculatedRefund > 0) {
                totalRefundAmount += calculatedRefund * item.quantity;

                // Update the refund field in the products array of the order
                const orderProduct = order.products.find(
                  (prod) =>
                    prod.productId.toString() === item.productId.toString() &&
                    prod.variantId.toString() === item.variantId.toString()
                );
                if (orderProduct) {
                  orderProduct.refund = {
                    requested: true,
                    amount: totalRefundAmount,
                    status: "pending",
                    requestDate: new Date(),
                  };
                }
              } else {
                throw new Errorhandler(
                  400,
                  "Invalid calculated refund amount for item"
                );
              }
            } else {
              throw new Errorhandler(400, "Refund period exceeded for item");
            }
          } else {
            throw new Errorhandler(
              400,
              `Item with ID ${item.productId} is not eligible for return`
            );
          }
        } catch (error) {
          return next(error);
        }
      })
    );

    console.log("Total refund amount:", totalRefundAmount);

    // Update order audit log
    order.auditLog.push({
      action: "return_requested",
      actor: order.user,
      timestamp: new Date(),
      description: `Refund of ₹${totalRefundAmount} requested for returned items.`,
    });
    order.orderStatus = "return_requested";
    // Save the updated order with refund status
    await order.save();

    // Return success response
    res.status(200).json({
      success: true,
      message:
        "Return processed successfully. Refund request has been initiated.",
      refundAmount: totalRefundAmount,
      order,
    });
  } catch (error) {
    console.log("Error occurred during return process:", error);
    next(
      new Errorhandler(
        500,
        "An error occurred while processing the return policy"
      )
    );
  }
};

export const FilterOrders = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extract filters from query parameters
    const {
      orderStatus, // Order status
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
    // console.log("this is a req.query:", req.query);
    // Initialize query object for MongoDB
    const query: any = {};
    const user = req.user?._id;

    // Add search conditions dynamically based on query params
    if (user) query.user = user;
    if (orderStatus) query.orderStatus = { $in: orderStatus };
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
      .sort(sortOptions)
      .populate("products.productId");

    // Count total matching documents (without pagination)
    const totalOrders = await Ordermodel.countDocuments(query);

    // Calculate total pages and pagination flags
    const totalPages = Math.ceil(totalOrders / Number(limit));
    const currentPage = Number(page);
    const hasNextPage = currentPage < totalPages;
    const hasPrevPage = currentPage > 1;
    // console.log("this is a orders :", orders);
    // Send response with pagination data
    res.status(200).json({
      success: true,
      orders,
      pagination: {
        totalOrders,
        currentPage,
        totalPages,
        limit: Number(limit),
        hasNextPage,
        hasPrevPage,
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
      return next(new Errorhandler(404, "Please enter a query for search"));
    }

    const user = req.user?._id;

    // Create a regex for case-insensitive searching
    const regex = new RegExp(searchQuery as string, "i"); // 'i' for case-insensitivity

    // Use $or to search across multiple fields
    const orders = await Ordermodel.find({
      user,
      $or: [
        { "address.street": regex },
        { "address.city": regex },
        { "address.state": regex },
        { "address.country": regex },
        { "address.name": regex },
        { "address.addressLine1": regex },
        { "address.addressLine2": regex },
        { "address.postalCode": regex },
        { "address.phone": regex },
        { giftMessage: regex },
      ],
    });

    res.status(200).json({
      message: "Searched your orders successfully",
      orders,
    });
  } catch (error) {
    next(error); // Ensure the error is passed to the next middleware
  }
};

export const updateOrderStatus = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId, status, cancelReason } = req.body;
    const userId = req.user?._id;
    const order = await Ordermodel.findById(orderId);
    if (!order) {
      return next(new Errorhandler(404, "Order not found"));
    }
    // we need to implement this in later after testing of this website
    // if (
    //   (user.role !== "admin" && user.role !== "delivery_boy") ||
    //   (user.role === "delivery_boy" && status !== "delivered")
    // ) {
    //   return next(new Errorhandler(403, "You are not authorized to update this order"));
    // }
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
      order.deliveryBoyId = userId as Schema.Types.ObjectId;
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
          order.finalAmount
        );
        if (refund.success) {
          return next(new Errorhandler(400, "Refund Failed"));
        }
        order.payment.paymentStatus = "refunded";
        // order.refund = {
        //   requested: true,
        //   amount: order.totalAmount,
        //   status: "completed",
        //   requestDate: new Date(),
        //   completionDate: new Date(),
        // };
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
    } else if (status === "delivered") {
      const isOntime = new Date() <= new Date(order.expectedDeliveryTime);
      order.deliveryTime = new Date();
      order.isDeliveredOnTime = isOntime;
      if(order.deliveryBoyId){
        const deliveryBoy=await usermodel.findById(order.deliveryBoyId);
        if(deliveryBoy){
          const earning=calculateEarnings(order.totalAmount,isOntime);
          deliveryBoy.DeliveryBoyEarnings.totalEarnings+=earning;
          deliveryBoy.DeliveryBoyEarnings.earningHistory.push({
            orderId:order._id as Schema.Types.ObjectId,
            date:new Date(),
            amount:earning
          })
          await deliveryBoy.save();
          
        }
      }
    }
    order.orderStatus = status;
    order.deliveryBoyId = userId as Schema.Types.ObjectId;
    await order.save();
    res.status(200).json({
      message: `order ${status} successfully`,
      order,
    });
  } catch (error) {
    next();
  }
};

export const processReturnedItems = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId, returnItems } = req.body;
    console.log("this is a return items :", returnItems);
    // Find the order by ID
    const order = await Ordermodel.findById(orderId);
    if (!order) {
      return next(new Errorhandler(404, "Order not found"));
    }

    // Calculate total refund amount for eligible return items
    let totalRefundAmount = 0;
    let totalAmount = 0;
    let discountAmount = 0;

    // Check if the order contains return items
    const itemsToProcess = order.products.filter((product) =>
      returnItems.some(
        (item: any) =>
          item.productId.toString() === product.productId.toString() &&
          item.variantId.toString() === product.variantId.toString()
      )
    );

    // Update product stocks and mark items as returned
    await Promise.all(
      itemsToProcess.map(async (orderProduct) => {
        const returnedItem = returnItems.find(
          (item: any) => item.productId === orderProduct.productId.toString()
        );

        if (returnedItem) {
          const product = await Product.findById(orderProduct.productId);
          if (!product) {
            throw new Errorhandler(404, `Product not found`);
          }

          // Update stock for the returned item
          const variant = product.variants.find(
            (v) => v._id.toString() === returnedItem.variantId.toString()
          );
          if (variant) {
            // Increment the stock of the variant
            variant.stock += returnedItem.quantity;

            // Update the return status of the order product
            if (orderProduct.refund) {
              orderProduct.refund.status = "completed"; // Mark as returned
              orderProduct.refund.completionDate = new Date(); // Set received date
            }
            // totalAmount += product.priceAtPurchase * product.quantity;
            // discountAmount += product.discount * product.quantity;
            // Calculate refund amount
            totalAmount += returnedItem.priceAtPurchase * returnedItem.quantity;
            discountAmount += returnedItem.discount * returnedItem.quantity;
          } else {
            throw new Errorhandler(404, `Variant not found for product`);
          }

          // Save the updated product stock
          await product.save();
        }
      })
    );
    totalRefundAmount = totalAmount - discountAmount;
    console.log("this is a totask refun amount :", totalRefundAmount);
    // Save the updated order with the modified refund statuses
    await order.save();

    // Process the payment refund
    const paymentRefundResponse = await refundPayment(
      order.payment.paymentId,
      totalRefundAmount
    );
    if (!paymentRefundResponse.success) {
      return next(new Errorhandler(500, "Refund failed"));
    }

    // Return success response
    res.status(200).json({
      success: true,
      message:
        "Returned items processed successfully. Product stocks updated and refund initiated.",
      order,
      refundDetails: paymentRefundResponse.data, // Include refund details in the response
    });
  } catch (error) {
    console.log("Error occurred while processing returned items:", error);
    next(
      new Errorhandler(500, "An error occurred while processing returned items")
    );
  }
};

export const FilterOrdersForAdmin = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      deliveryType,
      orderStatus,
      userId,
      startDate,
      endDate,
      productId,
      page = 1,
      limit = 10,
      searchTerm,
    } = req.query;

    // Convert page and limit to numbers
    const pageNumber = parseInt(page as string, 10);
    const limitNumber = parseInt(limit as string, 10);

    // Validate pagination inputs
    if (pageNumber < 1) {
      return res.status(400).json({
        success: false,
        message: "Page number must be greater than 0.",
      });
    }

    if (limitNumber < 1) {
      return res.status(400).json({
        success: false,
        message: "Limit must be greater than 0.",
      });
    }

    const filter: any = {};

    if (deliveryType) {
      filter.deliveryType = deliveryType;
    }

    if (orderStatus) {
      filter.orderStatus = orderStatus;
    }

    if (userId) {
      filter.user = userId;
    }

    if (productId) {
      filter.products = {
        ...filter.products,
        productId: productId,
      };
    }

    // Add search functionality
    if (searchTerm) {
      const regex = new RegExp(searchTerm as string, "i"); // Create a case-insensitive regex
      filter.$or = [
        { "user.name": regex }, // Assuming user has a name field
        { "products.productName": regex }, // Assuming product has a productName field
        { orderStatus: regex }, // Search in order status
        // Add other fields that should be searchable here
      ];
    }

    // Date filtering
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) {
        filter.createdAt.$gte = new Date(startDate.toString());
      }
      if (endDate) {
        filter.createdAt.$lte = new Date(endDate.toString());
      }
    }

    // Fetching orders based on filters
    const orders = await Ordermodel.find(filter)
      .populate("user")
      .populate("products.productId")

      .skip((pageNumber - 1) * limitNumber)
      .limit(limitNumber);

    const totalOrders = await Ordermodel.countDocuments(filter);

    res.status(200).json({
      success: true,
      orders,
      pagination: {
        totalOrders,
        totalPages: Math.ceil(totalOrders / limitNumber),
        currentPage: pageNumber,
        limit: limitNumber,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const GetSingleOrder = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  try {
    const { orderId } = req.params;
    const order = await Ordermodel.findById(orderId).populate(
      "products.productId"
    );
    if (!order) {
      return next(new Errorhandler(404, "order not found "));
    }
    res.status(200).json({
      order,
    });
  } catch (error) {
    next(error);
  }
};
