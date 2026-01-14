import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import fs from "fs";
import jwt from "jsonwebtoken";
// import dotenv from "dotenv";
// dotenv.config({
//   path: "./.env",
// });

// 1) get user details from frontend.
// 2) validation - not empty
// 3) check if user already exists : username, email
// 4) check for images, check for avatar
// 5) if images or avatar are available, then upload them to cloudinary
// 6) create user object - create entry in db
// 7) remove passowrd and refresh token field from response
// 8) check for user creation
// 8.1) - if user has been created send response.
// 8.2) - if user has not been created send error.

const registerUser = async (req, res) => {
  try {
    const { username, email, fullName, password } = req.body;
    // console.log({ username, email, fullName });

    if (fullName === "" || !fullName) {
      throw new ApiError(400, "fullname is required");
    }

    if (username === "" || !username) {
      throw new ApiError(400, "username is required");
    }

    if (email === "" || !email) {
      throw new ApiError(400, "email is required");
    }

    if (password === "" || !password) {
      throw new ApiError(400, "password is required");
    }

    if (!email.includes("@")) {
      throw new ApiError(400, "valid email required");
    }

    // if (
    //   [username, fullName, email, password].some((field) => {
    //     return field?.trim() === "";
    //   })
    // ) {
    //   throw new ApiError(400, "All fields are required");
    // }

    // console.log(req.files);

    let avatarLocalPath;
    if (
      req.files &&
      Array.isArray(req.files.avatar) &&
      req.files.avatar.length > 0
    ) {
      avatarLocalPath = req.files.avatar[0].path;
    }

    let coverImageLocalPath;
    if (
      req.files &&
      Array.isArray(req.files.coverImage) &&
      req.files.coverImage.length > 0
    ) {
      coverImageLocalPath = req.files.coverImage[0].path;
    }

    if (!avatarLocalPath) {
      if (coverImageLocalPath) {
        fs.unlinkSync(coverImageLocalPath);
      }
      throw new ApiError(400, "avatar is required");
    }

    // if (!coverImageLocalPath) {
    //   fs.unlinkSync(coverImageLocalPath);
    // }

    // if we want to find a document by only one field
    // const existingUser = await User.findOne({ email });

    // if want to find a document by more than one field, then we use the $or operator
    const existingUser = await User.findOne({
      $or: [{ username }, { email }],
    });
    // console.log(existingUser);

    if (existingUser) {
      if (avatarLocalPath) {
        fs.unlinkSync(avatarLocalPath);
      }
      if (coverImageLocalPath !== undefined) {
        fs.unlinkSync(coverImageLocalPath);
      }
      throw new ApiError(
        409,
        "user with this email or username already exists"
      );
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    // console.log(avatar);

    let coverImage;
    if (coverImageLocalPath) {
      coverImage = await uploadOnCloudinary(coverImageLocalPath);
    }

    if (!avatar?.url) {
      throw new ApiError(400, "avatar upload failed");
    }

    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      fullName,
      avatar: avatar.url,
      password,
      coverImage: coverImage?.url || "",
    });

    // console.log(user);

    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    // console.log(createdUser);

    if (!createdUser) {
      throw new ApiError(
        500,
        "Something went wrong while registering the user"
      );
    }

    return res
      .status(201)
      .json(new ApiResponse(201, createdUser, "User registered successfully"));
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

// 1. Get data from req.body (username or emai and password)
// 2. Find the user
// 3. Check the password
// 4. access and refersh token
const loginUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username && !email) {
      throw new ApiError(400, "username or email is required.");
    }

    if (!password) {
      throw new ApiError(400, "password is required");
    }

    const user = await User.findOne({
      $or: [{ username }, { email }],
    });

    if (!user) {
      throw new ApiError(404, "user does not exists");
    }

    const isPasswordValid = await user.isPasswordCorrect(
      password,
      user.password
    );

    if (!isPasswordValid) {
      throw new ApiError(401, "invalid user credentials");
    }

    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    const cookiesOptions = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookiesOptions)
      .cookie("refreshToken", refreshToken, cookiesOptions)
      .json(
        new ApiResponse(
          200,
          { success: true, user: loggedInUser, accessToken, refreshToken },
          "user logged in successfully"
        )
      );
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

const logoutUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    user.refreshToken = undefined;
    user.save();

    // await User.findByIdAndUpdate(
    //   userId,
    //   {
    //     $set: {
    //       refreshToken: undefined,
    //     },
    //   },
    //   {
    //     new: true,
    //   }
    // );

    const cookiesOptions = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(200)
      .clearCookie("accessToken", cookiesOptions)
      .clearCookie("refreshToken", cookiesOptions)
      .json(new ApiResponse(200, "user logged out successfully"));
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

const refreshAccessToken = async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies.refreshToken || req.body.refreshToken;

    if (!incomingRefreshToken) {
      throw new ApiError(401, "unauthorized request");
    }

    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const userId = decodedToken?._id;

    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(401, "invalid refresh token");
    }

    if (incomingRefreshToken !== user?.refreshToken) {
      throw new ApiError(401, "refresh token is expired or used");
    }

    const newAccessToken = user.generateAccessToken();
    const newRefreshToken = user.generateRefreshToken();

    user.accessToken = newAccessToken;
    user.refreshToken = newRefreshToken;

    await user.save({ validateBeforeSave: false });

    const cookiesOptions = {
      httpOnly: true,
      secure: true,
    };

    return res
      .status(201)
      .cookie("accessToken", newAccessToken, cookiesOptions)
      .cookie("refreshToken", newRefreshToken, cookiesOptions)
      .json(
        new ApiResponse(
          201,
          {
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          },
          "access token refreshed"
        )
      );
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

export { registerUser, loginUser, logoutUser, refreshAccessToken };
