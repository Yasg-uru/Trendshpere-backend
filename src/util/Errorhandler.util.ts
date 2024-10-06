import { NextFunction, Request, Response } from "express";

class Errorhandler extends Error {
  statuscode: number;
  // message: string;
  constructor(statuscode: number, message: string) {
    super();

    this.statuscode = statuscode;
    this.message = message;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
export const ErrorhandlerMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("this is a error:", err);
  if (err instanceof Errorhandler) {
    return res.status(err.statuscode).json({ error: err.message });
  }
  return res.status(500).json({ error: "Internal Server Error" });
};

export default Errorhandler;
