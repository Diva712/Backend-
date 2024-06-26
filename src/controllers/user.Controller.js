import { asyncHandler } from "../utils/asyncHandler.js";
import validator from "validator";
import { ApiError } from "../utils/ApiErrors.js"
import { User } from "../models/user.Model.js"
import { deleteOnCloudinary, uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";


//access and refresh token generation method
const generateAccessAndRefreshToken = async (userId) => {
    try {

        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        user.save({ validateBeforeSave: false })
        // console.log(accessToken)
        // console.log(refreshToken)
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
    //console.log(req.body)
    const { email, username, password } = req.body

    //2.
    // if (!username && !email) {
    //     throw new ApiError(400 , "username or email is required !!")
    // }

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

    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);

    // console.log('Access Token:', accessToken);
    //5.
    //optional step we can also update the user instead call to user database !!
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly: true, // only server can be modified cookies
        secure: true,
    }
    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200,
                {
                    user: loggedInUser,
                    accessToken,
                    // here jab maine cookie me save kar diya hai fir bhi send kr rha means ,,
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
            $unset: {
                refreshToken: 1//this removes the field from document 
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
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(new ApiResponse(200, {}, "User Logged Out Successfully !!"))
})


//refreshAccessToken
const refreshedAccessToken = asyncHandler(async (req, res) => {

    const inocmingRefreshtoken = req.cookies.refreshToken || req.body.refreshToken

    if (!inocmingRefreshtoken) {
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

        const { accessToken: accessNewToken, refreshToken: refreshNewToken } = await generateAccessAndRefreshToken(user._id)
        if (!accessNewToken || !refreshNewToken) {
            throw new ApiError(500, "Failed to generate new tokens.");
        }

        // console.log("access", accessNewToken);
        // console.log("refresh", refreshNewToken);

        return res
            .status(200)
            .cookie("accessToken", accessNewToken, options)
            .cookie("refreshToken", refreshNewToken, options)
            .json(new ApiResponse(200, {
                accessToken: accessNewToken,
                refreshToken: refreshNewToken
            }, "Access token refreshed successfully !!"));




    } catch (error) {

        throw new ApiError(401, error?.message || "Invalid refresh Token !!")
    }

})


//changeCurrentPasswordChange
const changeCurrentPassword = asyncHandler(async (req, res) => {
    const { oldPassword, newPassword, confirmPassword } = req.body

    if (newPassword !== confirmPassword) {
        throw new ApiError(404, "Password is not confirmed !!")
    }

    const user = await User.findById(req.user?._id)
    const isPasswordRight = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordRight) {
        throw new ApiError(404, "Invalid Old Password !!")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res.status(200).json(new ApiResponse(200, {}, "Password Changed Successfully !!"))
})


//getcurrentUser
const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(new ApiResponse(200, req.user, "Current user fetch successfully !!"))
})

//updateAccountDetails
const updateAccountDetails = asyncHandler(async (req, res) => {

    const { fullName, email } = req.body
    if (!fullName || !email) {
        throw new ApiError(400, "All fields are required !")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName: fullName,
                email: email
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.status(200).json(new ApiResponse(200, user, "Account details updated successfully !!"))
})

//updateAvatar
const updateUserAvatar = asyncHandler(async (req, res) => {
    //routing likhte waqt do middleware lgenge multer and auth wala
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(404, "Avatar files is missing !!")
    }

    //delete old avatar image (made)
    const uSER = await User.findById(req.user?._id);
    const oldAvatarImage = uSER.avatar
    const deleteResult = await deleteOnCloudinary(oldAvatarImage);

    if (deleteResult.result !== 'ok') {
        console.error("Failed to delete old avatar image from Cloudinary:", deleteResult);
        return res.status(500).json(new ApiResponse(500, "Unable to delete the old avatar form cloudinary !!"));
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(404, "Error while uploading on avatar !!")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.statur(200).json(new ApiResponse(200, user, "Avatar updated successfully !!"))
})

//updateCover
const updateCoverImage = asyncHandler(async (req, res) => {

    const coverImageLocalPath = req.file?.path;

    if (!coverImageLocalPath) {
        throw new ApiError(404, "Avatar files is missing !!")
    }

    //delete old image (made)
    const uSER = await User.findById(req.user._id);
    const oldCoverImage = uSER.coverImage
    const deleteResult = await deleteOnCloudinary(oldCoverImage)

    if (deleteResult.result !== 'ok') {
        console.error("Failed to delete old coverImage image from Cloudinary:", deleteResult);
        return res.status(500).json(new ApiResponse(500, "Unable to delete the old coverImage form cloudinary !!"));
    }

    const coverUpdateImage = await uploadOnCloudinary(coverImageLocalPath);
    if (!coverUpdateImage.url) {
        throw new ApiError(404, "Error while uploading on avatar !!")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverUpdateImage.url
            }
        },
        {
            new: true
        }
    ).select("-password")

    return res.statur(200).json(new ApiResponse(200, user, "CoverImage updated successfully !!"))


})

//getUserChannelProfile
const getUserChannelProfile = asyncHandler(async (req, res) => {

    const { username } = req.params
    if (!username?.trim()) {
        throw new ApiError(400, 'User name is missing !')
    }

    //aggreagate pipline method

    const channel = await User.aggregate(
        [
            {
                $match: {
                    username: username?.toLowerCase()
                }
            },
            {
                $lookup: {
                    form: "subscriptions",
                    localField: "_id",
                    foreignField: "channel", //age subsription schema s channel ko select karenge tb mlenge subscribers
                    as: "subscribers"
                }
            },
            {
                $lookup: {
                    form: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber", // wo sari cheeze mili jo maine subscribe kar rakhi hai
                    as: "subscribedTo"
                }
            },
            {
                $addFields: {
                    subscribersCount: {
                        $size: "$subscribers"
                    },
                    channelSubscribedToCount: {
                        $size: "subscribedTo"
                    },
                    isSubscribed: {
                        $cond: {
                            if: { $in: [req.user?._id, "$subscribers.subscriber"] },
                            then: true,
                            else: false
                        }
                    }
                }
            },
            {
                $project: {
                    fullName: 1,
                    username: 1,
                    avatar: 1,
                    coverImage: 1,
                    subscribersCount: 1,
                    channelSubscribedToCount: 1,
                    isSubscribed: 1,
                }
            }
        ]
    )
    console.log(channel);

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists !")
    }

    return res.status(200).json(new ApiResponse(200, channel[0], "User channel fetched successfully !!"))

})

//get watchHostory
const getWatchHistory = asyncHandler(async (req, res) => {

    //req.user._id se humko string milta hai jisko mongoose covert kar deta mongo db ki id me

    const user = await User.aggregate(
        [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user._id)
                }
            },
            {
                $lookup: {
                    from: "videos",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",

                    pipeline: [
                        {
                            $lookup: {
                                from: "users",
                                localField: "owner",
                                foreignField: "_id",
                                as: "owner",

                                pipeline: [
                                    {
                                        //bahar 2nd stage me bhi lga skte the project ki pipeline
                                        $project: {
                                            fullName: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        //frontend ki sahukiyat ke liye pipeline
                        {
                            $addFields: {
                                owner: {
                                    $first: "$owner"
                                }
                            }
                        }
                    ]

                }
            }
        ]
    )

    return res.status(200).json(new ApiResponse(200, user[0].watchHistory, "Watch History fetched successfully !!"))
})


















export {
    registerUser,
    loginUser,
    logoutUser,
    refreshedAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
}