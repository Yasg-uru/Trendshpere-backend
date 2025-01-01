"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sendtoken = (res, token, statuscode, user) => {
    const options = {
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        httpOnly: false,
        sameSite: "none",
        secure: true,
    };
    res.cookie("token", token, options).status(statuscode).json({
        success: true,
        user,
        token,
    });
};
exports.default = sendtoken;
