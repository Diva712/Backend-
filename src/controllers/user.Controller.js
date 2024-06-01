import { asyncHandler } from "../utils/asyncHandler.js";
import validator from "validator";
import { ApiError } from "../utils/ApiErrors.js"
import { User } from "../models/user.Model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"


//access and refresh token generation method
const generateAccessAndRefreshToken = async (userId) => {
    try {

        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }

    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh and access token !!")
    }
}




//register controller
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
        // console.log(existedUser);
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
        new ApiResponse(201, createdUser, "User Registered Successfully!!")
    )

})


//login controller
const loginUser = asyncHandler(async (req, res) => {
    //1. get a data form frontend
    //2. verify username and email
    //3. if found than check password
    //4. if password matched send request token and refresh token
    //5. send to user with in the secure cookies

    // 1.
    console.log(req.body)
    const { email, username, password } = req.body

    //2.
    // if (!username && !email) {
    //     throw new ApiError(400 , "username or email is required !!")
    // }
    console.log(username)
    console.log(email)
    console.log(password)
    // console.log(email)
    if (!username && !email) {
        throw new ApiError(404, "username or email is required !");
    }

    //we can also write this
    // if (!(username || email)) {
    //     throw new ApiError(404 , "username or email is required !")
    // }

    if (!password) {
        throw new ApiError(404, "password is required !");
    }
    //3.
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (!user) {
        throw new ApiError(404, "User does not exist !! Please Registered first !")
    }

    //4.

    const isPasswordValid = await user.isPasswordCorrect(password)


    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid User Credentials !!")
    }

    const { accesToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    //5.
    //optional step we can also update the user instead call to user database !!
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true, // only server can be modified cookies
        secure: true,
    }

    return res
        .status(200)
        .cookie("accesToken", accesToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser,
                    accesToken, // here jab maine cookie me save kar diya hai fir bhi send kr rha means ,,
                    //there may be chances that user want to save refresh token or access token to save in local memory
                    refreshToken
                },
                "User Logged In successfully !!"
            )
        )
})


//logoutUser Controller
const logoutUser = asyncHandler(async (req, res) => {

    //1. Clear all set cookies
    //2. reset refreshedToken 
    await User.findByIdAndUpdate(req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true,
    }

    return res
        .status(200)
        .clearCookie("accesToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out Successfully !!"))
})


//refreshAccessToken
const refreshedAccessToken = asyncHandler(async (req, res) => {

    const inocmingRefreshtoken = req.cookies.refreshToken || req.body.refreshToken

    if (inocmingRefreshtoken) {
        throw new ApiError(401, 'Unauthorized request !')
    }

    try {
        const decodedToken = jwt.verify(inocmingRefreshtoken, process.env.REFRESH_TOKEN_SECRET)

        const user = await User.findById(decodedToken?._id)

        if (!user) {
            throw new ApiError(401, "Invalid refresh token !")
        }

        if (inocmingRefreshtoken !== user?.refreshToken) {
            throw new ApiError(401, "Refresh token is expired or used !")
        }

        const options = {
            httpOnly: true,
            secure: true
        }

        const { accessNewToken, refreshNewToken } = await generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessNewToken)
            .cookie("refreshToken", refreshNewToken)
            .json(new ApiResponse(200,
                {
                    accessToken: accessNewToken,
                    refreshToken: refreshNewToken
                },
                "Access token refreshed successfully !!"
            ))

    } catch (error) {

        throw new ApiError(401, error?.message || "Invalid refresh Token !!")
    }

})












export { registerUser, loginUser, logoutUser, refreshedAccessToken }