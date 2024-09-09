import express, { Application } from "express";
import { config } from "dotenv";
config();
const app:Application=express();
const PORT=process.env.PORT || 4000;

app.listen(PORT,()=>{
console.log(`Trendsphere server is running on port :${PORT}`);
});
