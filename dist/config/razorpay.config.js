"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const razorpay_1 = __importDefault(require("razorpay"));
const razorpay = new razorpay_1.default({
    key_id: "rzp_live_tK7jKIBkQuTeH7",
    key_secret: "d3q0tkLxfFVKoizPqeboYYsm",
});
exports.default = razorpay;
