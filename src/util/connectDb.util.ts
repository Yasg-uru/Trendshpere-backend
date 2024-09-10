import mongoose from "mongoose";

export const ConnectDB = async (): Promise<void> => {
  try {
    const response = await mongoose.connect(process.env.MONGO_URI as string);
    console.log(
      `Trendsphere Database connected with : ${response.connection.host}`
    );
  } catch (error) {
    console.log(`Error in Trendsphere database connectivity`, error);
    process.exit(1);
  }
};
