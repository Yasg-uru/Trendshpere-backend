import { NextFunction, Request, Response } from "express";

const catchAsync =
  <T>(fn: (req: Request, res: Response, next: NextFunction) => Promise<T>) =>
  (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch((error) => {
      console.error(error);

      res.status(500).json({ message: "Internal Server Error" });
    });
  };

export default catchAsync;