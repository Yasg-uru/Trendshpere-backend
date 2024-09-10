import express, { Application } from "express";
import { config } from "dotenv";
import { ConnectDB } from "./util/connectDb.util";
config();
const app: Application = express();
const PORT = process.env.PORT || 4000;
ConnectDB();

app.listen(PORT, () => {
  console.log(`Trendsphere server is running on port :${PORT}`);
});
