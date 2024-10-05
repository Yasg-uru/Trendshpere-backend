"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class productService {
    static calculateAverage(reviews) {
        let sum = 0;
        reviews.forEach((review) => {
            sum += review.rating;
        });
        return Math.floor(sum / reviews.length);
    }
}
exports.default = productService;
