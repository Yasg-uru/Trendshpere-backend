import { Request, Response, NextFunction } from "express-serve-static-core";
import Errorhandler from "../util/Errorhandler.util";
import jwt from "jsonwebtoken";
import { JwtDecodedUser } from "../types/jwtDecodedUser";
import usermodel, { User } from "../model/usermodel";
export interface reqwithuser extends Request {
  user?: User;
}

const isAuthenticated = async (
  req: reqwithuser,
  res: Response,
  next: NextFunction
) => {
  const token = req.cookies?.token;
  if (!token) {
    return next(new Errorhandler(400, "please login to continue"));
  }
  const decodedUser = jwt.verify(
    token,
    process.env.JWT_SECRET as string
  ) as JwtDecodedUser;
  const user = await usermodel.findById(decodedUser.id);
  if (!user) {
    return next(new Errorhandler(404, "User not found"));
  }

  req.user = user;
  next();
};


const authorization = (roles: string[]) => {
  return (req: reqwithuser, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.Role)) {
      return next(new Errorhandler(400, "access denied"));
    }
    next();
  };
};
export { isAuthenticated, authorization };
