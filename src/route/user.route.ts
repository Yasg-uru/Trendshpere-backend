import { Router } from "express";
import {
  forgotPassword,
  Login,
  Logout,
  registerUser,
  Resetpassword,
  verifyuser,
} from "../controller/user.controller";
import upload from "../middleware/multer.middleware";
import { isAuthenticated } from "../middleware/auth.middleware";

const userRouter = Router();
userRouter.post("/register", upload.single("avatar"), registerUser);
userRouter.post("/verify-code", verifyuser);
userRouter.post("/sign-in", Login);
userRouter.post("/logout", Logout);
userRouter.post("/forgot-password", forgotPassword);
userRouter.put("/reset-password/:token", Resetpassword);

export default userRouter;
