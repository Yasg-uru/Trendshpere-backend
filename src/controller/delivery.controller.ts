import { Response } from "express"; // Don't forget to import Response
import { NextFunction } from "express";
import { reqwithuser } from "../middleware/auth.middleware";
import usermodel from "../model/usermodel";
import Errorhandler from "../util/Errorhandler.util";
import Ordermodel from "../model/order.model";
import mongoose, { Schema } from "mongoose";
import { io } from "..";
function getStartOfWeek(date: Date) {
  const startOfWeek = new Date(date);
  startOfWeek.setHours(0, 0, 0, 0); // Set time to 00:00:00
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay()); // Adjust to the start of the week (Sunday)
  return startOfWeek;
}
const calculatePercentage = (part: number, total: number): number => {
  return total === 0 ? 0 : (part / total) * 100;
};
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

      const deliveryCounts = {
        completed: 0,
        pending: 0,
      };

      orderCounts.forEach((order) => {
        if (order._id === "delivered") {
          deliveryCounts.completed = order.count;
        } else if (order._id === "pending") {
          deliveryCounts.pending = order.count;
        }
      });

      const pendingOrders = await Ordermodel.find({
        "address.city": DeliverBoy.deliveryArea?.city,
        "address.state": DeliverBoy.deliveryArea?.state,
        "address.postalCode": DeliverBoy.deliveryArea?.postalCode,
        "address.country": DeliverBoy.deliveryArea?.country,
        orderStatus: "pending",
      });

      // Send the response
      return res.status(200).json({
        deliveryData: {
          deliveryCounts,
          pendingOrders,
        },
      });
    } catch (error) {
      return next(new Errorhandler(500, "Internal server error"));
    }
  }
  public static async createDeliveryBoy(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const { userId, vehicleDetails, deliveryArea, status } = req.body;
      const user = await usermodel.findById(userId);

      if (!user) {
        return next(new Errorhandler(404, "User not found "));
      }

      user.vehicleDetails = vehicleDetails;
      user.deliveryArea = deliveryArea;
      user.status = status;
      user.Role = "delivery_boy";
      await user.save();
      res.status(200).json({
        message: "Created delivery boy successfully",
      });
    } catch (error) {
      console.log("this is a error ", error);
      next(error);
    }
  }
  public static async getWeeklyDeliveries(
    req: reqwithuser, // Ensure reqwithuser includes user details, like deliveryBoyId
    res: Response,
    next: NextFunction
  ) {
    try {
      const clonedDate = new Date();
      const dayOfWeek = clonedDate.getDay();
      const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      clonedDate.setDate(clonedDate.getDate() - diff);
      clonedDate.setHours(0, 0, 0, 0);

      const startOfWeek = clonedDate;
      console.log("this is a start of the week :", startOfWeek);
      const deliveryBoyId = req.user?._id; // Fetch deliveryBoyId from params (or req.query)

      // MongoDB aggregation pipeline
      const deliveries = await Ordermodel.aggregate([
        // Match orders where the product was delivered in the current week and by the specific delivery boy
        {
          $match: {
            orderStatus: "delivered", // Only count delivered orders
            updatedAt: { $gte: startOfWeek }, // Only count deliveries within the current week
            deliveryBoyId: deliveryBoyId,
          },
        },
        // Project to include day of the week
        {
          $project: {
            dayOfWeek: { $dayOfWeek: "$updatedAt" }, // Get day of the week (1=Sunday, 2=Monday, ..., 7=Saturday)
          },
        },
        // Group by day of the week and count the number of deliveries
        {
          $group: {
            _id: "$dayOfWeek", // Group by day of the week
            totalDeliveries: { $sum: 1 }, // Count total deliveries for each day
          },
        },
        // Sort by day of the week (1 to 7)
        { $sort: { _id: 1 } },
      ]);

      // Prepare data to match the format of deliveryData
      const deliveryCounts = new Array(7).fill(0); // Initialize array with 0s for each day of the week
      deliveries.forEach((delivery) => {
        // delivery._id is the day of the week (1-7)
        deliveryCounts[delivery._id - 1] = delivery.totalDeliveries; // Map delivery count to the correct day (0-6)
      });

      // Return the weekly delivery data in the desired format
      return res.status(200).json({
        success: true,
        weeklyData: {
          labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
          datasets: [
            {
              label: "Deliveries Completed",
              data: deliveryCounts,
              backgroundColor: "rgba(75, 192, 192, 0.6)",
              borderColor: "rgba(75, 192, 192, 1)",
              borderWidth: 1,
            },
          ],
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch weekly deliveries",
      });
    }
  }
  public static async calculateDeliveryPerformance(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const deliveryBoyId = req.user?._id;
      const currentDate = new Date();
      const lastweek = new Date(currentDate.getTime() - 7);
      const TotalOrders = await Ordermodel.find({
        deliveryBoyId: deliveryBoyId,
        orderStatus: "delivered",
      });
      const totalDeliveries = TotalOrders.length;
      const OntimeDeliveries = TotalOrders.filter(
        (order) => order.isDeliveredOnTime
      ).length;
      const onTimePercentage = calculatePercentage(
        OntimeDeliveries,
        totalDeliveries
      );
      const lastweekOrders = await Ordermodel.find({
        orderStatus: "delivered",
        deliveryBoyId,
        deliveryTime: { $gte: lastweek, $lte: currentDate },
      });
      const lastWeekOntimeDeliveries = lastweekOrders.filter(
        (order) => order.isDeliveredOnTime
      ).length;

      const lastweekpercentage = calculatePercentage(
        lastWeekOntimeDeliveries,
        lastweekOrders.length
      );
      const performanceDifference = onTimePercentage - lastweekpercentage;
      res.status(200).json({
        data: {
          totalDeliveries,
          OntimeDeliveries,
          onTimePercentage,
          lastweekpercentage,
          performanceDifference: performanceDifference.toFixed(2),
          message:
            performanceDifference > 0
              ? `+${performanceDifference.toFixed(2)}% from last week`
              : performanceDifference < 0
              ? `-${Math.abs(performanceDifference).toFixed(2)}% from last week`
              : "",
        },
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
      const userId = req.user?._id;
      const { deliveryBoyId } = req.params;

      const { rating } = req.body;
      const deliveryBoy = await usermodel.findById(deliveryBoyId);
      if (!deliveryBoy) {
        return next(new Errorhandler(404, "Delivery boy not found "));
      }
      if (
        deliveryBoy.deliveryBoyRatings.rateBy.includes(
          userId as Schema.Types.ObjectId
        )
      ) {
        return next(new Errorhandler(404, "Already you rated "));
      }

      deliveryBoy.deliveryBoyRatings.ratings =
        deliveryBoy.deliveryBoyRatings.ratings *
          (deliveryBoy.deliveryBoyRatings.totalRatings - 1) +
        rating;
      deliveryBoy.deliveryBoyRatings.totalRatings += 1;
      deliveryBoy.deliveryBoyRatings.rateBy.push(
        userId as Schema.Types.ObjectId
      );
      await deliveryBoy.save();
      res.status(200).json({
        message: "successfully added your ratings ",
      });
    } catch (error) {
      next(error);
    }
  }
  public static async getdeliveryboyRatings(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?._id;
      const deliveryBoy = await usermodel.findById(userId);
      if (!deliveryBoy) {
        return next(new Errorhandler(404, "delivery boy not found"));
      }
      res.status(200).json({
        ratings: {
          averageRating: deliveryBoy.deliveryBoyRatings.ratings,
          totalReviews: deliveryBoy.deliveryBoyRatings.totalRatings,
        },
      });
    } catch (error) {
      next(error);
    }
  }
  public static async getDeliveryEarnings(
    req: reqwithuser,
    res: Response,
    next: NextFunction
  ) {
    try {
      const userId = req.user?._id;
      const deliveryBoy = await usermodel
        .findById(userId)
        .select("DeliveryBoyEarnings");
      if (!deliveryBoy) {
        return next(new Errorhandler(404, "User not found "));
      }
      const Earnings = deliveryBoy.DeliveryBoyEarnings;
      const yesterDay = new Date();
      yesterDay.setDate(yesterDay.getDate() - 1);
      const yesterdayEarnings = Earnings.earningHistory
        .filter((earning) => earning.date >= yesterDay)
        .reduce((acc, earning) => acc + earning.amount, 0);
      const difference = yesterdayEarnings.toFixed(2);
      res.status(200).json({
        DeliveryEarnings: {
          TotalEarnings: Earnings.totalEarnings.toFixed(2),
          yesterdayEarnings: difference,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export default DeliveryController;
