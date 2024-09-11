import { NextFunction, Request, Response } from "express";
import Errorhandler from "../util/Errorhandler.util";
import { reqwithuser } from "../middleware/auth.middleware";
class ordercontroller{
    public static async  createOrder(req:reqwithuser,res:Response,next:NextFunction) {
        try {
            const user=req.user?._id;
            const {products ,totalAmount,}=req.body;
        } catch (error) {
            
        }
        
    }
}