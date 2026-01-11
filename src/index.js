import dotenv from "dotenv";
dotenv.config({
  path: ".env",
});

import connectDB from "./db/index.js";
import { app } from "./app.js";

const port = process.env.PORT || 8001;

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log("Server Error: ", error);
      throw error;
    });
    app.listen(port, () => {
      console.log(`Server running on PORT ${port}`);
    });
  })
  .catch((error) => {
    console.log("MongoDB Connection Failed: ", error);
  });

/*

One way of connecting to mongodb using mongoose
import express from "express";

const app = express();

(async () => {
  try {
    await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    app.on("error", (error) => {
      console.log("ERROR: ", error);
      throw error;
    });
    app.listen(process.env.PORT, () => {
      console.log(`Server running on PORT ${process.env.PORT}`);
    });
  } catch (error) {
    console.error("ERROR: ", error);
    throw error;
  }
})();

*/
