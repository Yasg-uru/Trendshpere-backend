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
exports.sendResetPasswordMail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const Transporter = nodemailer_1.default.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    service: "yashpawar12122004@gmail.com",
    auth: {
        user: "yashpawar12122004@gmail.com",
        pass: "arhj ynqn zxbk dncj",
    },
});
const sendVerificationMail = (username, email, verifyCode) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const MailOptions = {
            from: "yashpawar12122004@gmail.com",
            to: email,
            subject: "Procoders verification code",
            text: `your verification code is ${verifyCode} for username :${username}`,
        };
        const response = yield Transporter.sendMail(MailOptions);
        console.log("this is a mail response:", response);
        return {
            success: true,
            message: "Verification email sent successfully",
        };
    }
    catch (error) {
        console.log("Error in sending email");
        return {
            success: false,
            message: "Failed to send verification email",
        };
    }
});
const sendResetPasswordMail = function (ResetLink, email) {
    return __awaiter(this, void 0, void 0, function* () {
        const MailOptions = {
            from: "yashpawar12122004@gmail.com",
            to: email,
            subject: "Password Reset",
            text: `Please click on the following link to reset password:\n\n ${ResetLink}`,
        };
        try {
            const response = yield Transporter.sendMail(MailOptions);
            return {
                success: true,
                message: "Reset password mail sent sucessfully",
            };
        }
        catch (error) {
            return {
                success: false,
                message: "Error in sending forgot password mail",
            };
        }
    });
};
exports.sendResetPasswordMail = sendResetPasswordMail;
exports.default = sendVerificationMail;
