import { Response } from "express"; // Don't forget to import Response
import { NextFunction } from "express";
import { reqwithuser } from "../middleware/auth.middleware";
import usermodel from "../model/usermodel";
import Errorhandler from "../util/Errorhandler.util";
import Ordermodel from "../model/order.model";

class DeliveryController {
  public static async getMyDeliveries(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?._id;
      const DeliverBoy = await usermodel.findById(userId);
      if (!DeliverBoy) {
        return next(new Errorhandler(404, "User not found"));
      }

      // Count completed and pending orders
      const orderCounts = await Ordermodel.aggregate([
        {
          $match: {
            $and: [
              { "address.city": DeliverBoy.deliveryArea?.city },
              { "address.state": DeliverBoy.deliveryArea?.state },
              { "address.postalCode": DeliverBoy.deliveryArea?.postalCode },
              { "address.country": DeliverBoy.deliveryArea?.country },
            ],
          },
        },
        {
          $group: {
            _id: "$orderStatus",
            count: { $sum: 1 },
          },
        },
      ]);

      // Create an object to hold counts
      const deliveryCounts = {
        completed: 0,
        pending: 0,
      };

      // Populate the counts based on the results from aggregation
      orderCounts.forEach((order) => {
        if (order._id === "delivered") {
          deliveryCounts.completed = order.count;
        } else if (order._id === "pending") {
          deliveryCounts.pending = order.count;
        }
      });

      // Fetch pending orders
      const pendingOrders = await Ordermodel.find({
        "address.city": DeliverBoy.deliveryArea?.city,
        "address.state": DeliverBoy.deliveryArea?.state,
        "address.postalCode": DeliverBoy.deliveryArea?.postalCode,
        "address.country": DeliverBoy.deliveryArea?.country,
        orderStatus: "pending", // Only fetch pending orders
      });

      // Send the response
      return res.status(200).json({
        deliveryCounts,
        pendingOrders,
      });
    } catch (error) {
      return next(new Errorhandler(500, "Internal server error"));
    }
  }
}

export default DeliveryController;