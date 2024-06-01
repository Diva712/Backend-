import { v2 as cloudinary } from "cloudinary"
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
    try {

        if (!localFilePath) {
            console.log("LocalFilePath is not found !! ")
            return null;
        }

        //upload the file on cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        })

        //file has been successfully upload
        // console.log("file is uploaded in cloudinary !!", response.url);

        fs.unlinkSync(localFilePath);
        //console.log("cloudinary response", response)
        return response;

    } catch (error) {

        fs.unlinkSync(localFilePath) //remove the local saved temperary file as the upload operation got failed
        return null;

    }
}

const deleteOnCloudinary = async (cloudinaryUrl) => {
    if (!cloudinaryUrl) {
        console.log("Cloudinary URL is not found!");
        return null;
    }

    try {
        // Extract public ID from the Cloudinary URL
        const publicId = cloudinaryUrl.split('/').pop().split('.')[0];

        // Delete the image using the public ID
        const result = await cloudinary.uploader.destroy(publicId);

        console.log("Cloudinary response:", result);
        return result;
    } catch (error) {
        console.error("Error deleting image from Cloudinary:", error);
        return null;
    }
};

export { uploadOnCloudinary, deleteOnCloudinary }