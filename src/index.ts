import express, { Application, urlencoded } from "express";
import cookieParser from "cookie-parser";

import { config } from "dotenv";
import { ConnectDB } from "./util/connectDb.util";
import productRouter from "./route/product.route";
import userRouter from "./route/user.route";
import cors from "cors";
import orderRouter from "./route/order.route";
import { ErrorhandlerMiddleware } from "./util/Errorhandler.util";
import deliveryRouter from "./route/delivery.route";
import { Socket, Server as SocketServer } from "socket.io";
import http from "http";
config();
const app: Application = express();
const server = http.createServer(app);
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    origin: ["http://localhost:5173", "https://trendsphere-three.vercel.app"],

    credentials: true,
  })
);
const io = new SocketServer(server, {
  cors: {
    origin: ["http://localhost:5173", "https://trendsphere-three.vercel.app"],
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.use(urlencoded({ extended: false }));

const PORT = process.env.PORT || 4000;
const userSocketMap = new Map<string, string>();
app.use("/product", productRouter);
app.use("/user", userRouter);
app.use("/order", orderRouter);
app.use("/delivery", deliveryRouter);

io.on("connection", (socket) => {
  console.log("socket is connected with id :", socket.id);
  socket.on("register", (userId: string) => {
    userSocketMap.set(userId, socket.id);
    console.log(`User Registered :${userId} with Socket ID :${socket.id} `);
  });
  socket.on("disconnect", () => {
    for (const [userId, socketID] of userSocketMap.entries()) {
      if (socketID === socket.id) {
        userSocketMap.delete(userId);
        console.log(`User disconnected: ${userId}`);
        break;
      }
    }
    console.log(`socket is disconnected `);
  });
});
app.use(ErrorhandlerMiddleware);
ConnectDB();

server.listen(PORT, () => {
  console.log(`Trendsphere server is running on port :${PORT}`);
});
export { io, userSocketMap };
