"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorization = exports.isAuthenticated = void 0;
const Errorhandler_util_1 = __importDefault(require("../util/Errorhandler.util"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const usermodel_1 = __importDefault(require("../model/usermodel"));
const isAuthenticated = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const token = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.token;
    if (!token) {
        return next(new Errorhandler_util_1.default(400, "please login to continue"));
    }
    const decodedUser = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET);
    const user = yield usermodel_1.default.findById(decodedUser.id);
    if (!user) {
        return next(new Errorhandler_util_1.default(404, "User not found"));
    }
    req.user = user;
    next();
});
exports.isAuthenticated = isAuthenticated;
const authorization = (roles) => {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.Role)) {
            return next(new Errorhandler_util_1.default(400, "access denied"));
        }
        next();
    };
};
exports.authorization = authorization;
