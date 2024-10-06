import { Router } from "express";
import {
  AddNewAddress,
  forgotPassword,
  GetCarts,
  getUserData,
  Login,
  Logout,
  registerUser,
  Resetpassword,
  updateAddress,
  verifyuser,
} from "../controller/user.controller";
import upload from "../middleware/multer.middleware";
import { isAuthenticated } from "../middleware/auth.middleware";
import ProductController from "../controller/product.controller";

const userRouter = Router();
userRouter.post("/register", upload.single("avatar"), registerUser);
userRouter.post("/verify-code", verifyuser);
userRouter.post("/sign-in", Login);
userRouter.post("/logout", Logout);
userRouter.post("/forgot-password", forgotPassword);
userRouter.put("/reset-password/:token", Resetpassword);
userRouter.get("/carts", isAuthenticated, GetCarts);
userRouter.post("/add-address", isAuthenticated, AddNewAddress);
userRouter.put("/update-address/:addressId", isAuthenticated, updateAddress);
userRouter.get("/userdata", isAuthenticated, getUserData);
export default userRouter;
