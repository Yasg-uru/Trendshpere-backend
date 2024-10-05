"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const catchAsync = (fn) => (req, res, next) => {
    fn(req, res, next).catch((error) => {
        console.error(error);
        res.status(500).json({ message: "Internal Server Error" });
    });
};
exports.default = catchAsync;
