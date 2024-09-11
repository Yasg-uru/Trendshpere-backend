import express, { Application, urlencoded } from "express";
import cookieParser from "cookie-parser";

import { config } from "dotenv";
import { ConnectDB } from "./util/connectDb.util";
import productRouter from "./route/product.route";
import userRouter from "./route/user.route";
import cors from "cors";
config();
const app: Application = express();
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: "http://127.0.0.1:5500/example.html",
    credentials: true,
  })
);

app.use(urlencoded({ extended: false }));

const PORT = process.env.PORT || 4000;
app.use("/product", productRouter);
app.use("/user", userRouter);

ConnectDB();

app.listen(PORT, () => {
  console.log(`Trendsphere server is running on port :${PORT}`);
});
