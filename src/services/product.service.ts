import { IProductReview } from "../model/product.model";

class productService {
  public static calculateAverage(reviews: IProductReview[]): number {
    let sum: number = 0;
    reviews.forEach((review) => {
      sum += review.rating;
    });
    return Math.floor(sum / reviews.length);
  }
}
export default productService;
