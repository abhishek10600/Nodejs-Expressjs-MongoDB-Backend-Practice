import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import dotenv from "dotenv";
dotenv.config({
  path: "./.env",
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    // console.log("cloudinary: ", localFilePath);
    if (!localFilePath) {
      return null;
    }

    // upload the file on cloudianry
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // file has been uploaded successfully
    // console.log("file is uploaded on cloudinary. Image URL: ", response.url);
    // console.log("Cloudinary Response: ", cloudinary);

    // remove the locally saved temporary file as the cloudinary upload operation has completed successfully.
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    console.log("Cloudinary Error: ", error);
    fs.unlinkSync(localFilePath); // remove the locally saved temporary file as the cloudianry upload operation got failed.
    return null;
  }
};

const deleteFromCloudinary = async (imageUrl) => {
  const imageUrlArray = imageUrl.split("/");
  const imageNameWithExtension = imageUrlArray[imageUrlArray.length - 1];
  const imageNameWithExtensionArray = imageNameWithExtension.split(".");
  const imageName = imageNameWithExtensionArray[0];

  try {
    await cloudinary.uploader.destroy(imageName);
  } catch (error) {
    console.log("Cloudinary Error: ", error);
    return null;
  }
};

export { uploadOnCloudinary, deleteFromCloudinary };

/*the flow:
    1) User will upload a file.
    2) We will store that file in our server temprarily.
    3) Then we will take that file from our server and upload it to cloudinary.
    4) After uploading that file to cloudinary, we will delete that file from our server
*/

// jmdxoha230ngbyntw3ue
