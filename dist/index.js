"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userSocketMap = exports.io = void 0;
const express_1 = __importStar(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = require("dotenv");
const connectDb_util_1 = require("./util/connectDb.util");
const product_route_1 = __importDefault(require("./route/product.route"));
const user_route_1 = __importDefault(require("./route/user.route"));
const cors_1 = __importDefault(require("cors"));
const order_route_1 = __importDefault(require("./route/order.route"));
const Errorhandler_util_1 = require("./util/Errorhandler.util");
const delivery_route_1 = __importDefault(require("./route/delivery.route"));
const socket_io_1 = require("socket.io");
const http_1 = __importDefault(require("http"));
(0, dotenv_1.config)();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
app.use((0, cors_1.default)({
    origin: ["http://localhost:5173", "https://trendsphere-frontend.vercel.app"],
    credentials: true,
}));
const io = new socket_io_1.Server(server, {
    cors: {
        origin: ["http://localhost:5173", "https://trendsphere-frontend.vercel.app"],
        methods: ["GET", "POST"],
        credentials: true,
    },
});
exports.io = io;
app.use((0, express_1.urlencoded)({ extended: false }));
const PORT = process.env.PORT || 4000;
const userSocketMap = new Map();
exports.userSocketMap = userSocketMap;
app.use("/product", product_route_1.default);
app.use("/user", user_route_1.default);
app.use("/order", order_route_1.default);
app.use("/delivery", delivery_route_1.default);
io.on("connection", (socket) => {
    console.log("socket is connected with id :", socket.id);
    socket.on("register", (userId) => {
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
app.use(Errorhandler_util_1.ErrorhandlerMiddleware);
(0, connectDb_util_1.ConnectDB)();
server.listen(PORT, () => {
    console.log(`Trendsphere server is running on port :${PORT}`);
});
