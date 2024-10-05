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
const cloudinary_1 = require("cloudinary");
const fs_1 = __importDefault(require("fs"));
cloudinary_1.v2.config({
    cloud_name: "duzmyzmpa",
    api_key: "667322765163825",
    api_secret: "3vbirFk2VL-InUpDy7BMdpPdRdk",
});
const UploadOnCloudinary = (localFilePath) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!localFilePath) {
            fs_1.default.unlinkSync(localFilePath);
            return null;
        }
        const response = yield cloudinary_1.v2.uploader.upload(localFilePath, {
            resource_type: "auto",
        });
        fs_1.default.unlinkSync(localFilePath);
        return response;
    }
    catch (error) {
        fs_1.default.unlinkSync(localFilePath);
        return null;
    }
});
exports.default = UploadOnCloudinary;
