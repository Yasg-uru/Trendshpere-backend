"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorhandlerMiddleware = void 0;
class Errorhandler extends Error {
    // message: string;
    constructor(statuscode, message) {
        super();
        this.statuscode = statuscode;
        this.message = message;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
const ErrorhandlerMiddleware = (err, req, res, next) => {
    console.log("this is a error:", err);
    if (err instanceof Errorhandler) {
        return res.status(err.statuscode).json({ error: err.message });
    }
    return res.status(500).json({ error: "Internal Server Error" });
};
exports.ErrorhandlerMiddleware = ErrorhandlerMiddleware;
exports.default = Errorhandler;
