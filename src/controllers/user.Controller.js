import { asyncHandler } from "../utils/asyncHandler.js";
import validator from "validator";
import { ApiError } from "../utils/ApiErrors.js"
import { User } from "../models/user.Model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";


const registerUser = asyncHandler(async (req, res) => {
    //register the user

    //1. get the datafrom frontend
    //2. validation-not empty
    //3. check if user already exist or not
    //4. check for images , check for avtar
    //5. upload them to cloudinary , avtar
    //6. create user object - create entry in db
    //7. remove password and refresh token field from the response
    //8/ check for user creatiom
    //9. return response


    //1.
    //humko pehle routes me middle ware lgana pdega taki files (images) send kar paye
    //check route code 
    const { fullName, email, username, password } = req.body
    // console.log("req.body ko print kr rhe hai", req.body);
    //2.
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required !!")
    }


    if (!validator.isEmail(email)) {
        throw new ApiError(400, "Email is not valid !!")
    }

    if (!req.files || !req.files.avatar || !req.files.avatar[0]) {
        throw new ApiError(400, "Avatar image is required !!");
    }

    // console.log("req.files ko console kar rhe hai ", req.files);

    //3.

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        console.log(existedUser);
        throw new ApiError(409, "User with email or  username already exist !!")
    }


    //4.
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //  const coverImageLocalPath = req.files?.coverImage[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;

    //5.

    let avatar;
    if (avatarLocalPath) {
        avatar = await uploadOnCloudinary(avatarLocalPath)
        console.log("avatar from cloudinary :")
        console.log(avatar);
    }
    else {
        throw new ApiError(400, "Avatar file is required !!");
    }


    let coverImage;
    if (coverImageLocalPath) {
        coverImage = await uploadOnCloudinary(coverImageLocalPath);
        console.log("coverImage from cloudinary :", coverImage);
    }
    else {
        console.log("cover image is not selected!!")
    }



    //fir se check

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required !!")
    }






    //6.

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()

    })

    //7. check user bna bhi hai ya nahi

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    //8.
    if (!createdUser) {
        throw new ApiError(500, "something went wrong while registering the user !!")
    }


    //9.
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User Registered Successfully!1")
    )












})

export { registerUser }