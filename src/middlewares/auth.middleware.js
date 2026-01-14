import { ApiError } from "../utils/ApiError.js";
import jwt from "jsonwebtoken";
// import dotenv from "dotenv";
import { User } from "../models/user.model.js";
// dotenv.config({
//   path: "./.env",
// });

export const verifyJWT = async (req, res, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      throw new ApiError(401, "unauthorized request");
    }

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);

    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "invalid access token");
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Error: ", error);

    const statusCode = error instanceof ApiError ? error.statusCode : 500;

    const message =
      error instanceof ApiError ? error.message : "Internal Server Error";

    return res.status(statusCode).json({
      success: false,
      message,
      errors: error.errors || [],
    });
  }
};
