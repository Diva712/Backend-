import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import bcrypt from "bcrypt"

const userSchema = new mongoose.Schema({

    username: {
        type: String,
        required: [true, 'Username is required !!'],
        unique: true,
        trim: true,
        lowercase: true,
        index: true
    },
    email: {
        type: String,
        required: [true, 'Email is required !!'],
        unique: true,
        trim: true,
        lowercase: true,

    },
    fullName: {
        type: String,
        required: [true, 'FullName is required !!'],
        trim: true,
        index: true
    },
    avatar: {
        type: String,//cloudinary service url
        required: [true, 'Avatar is required !!'],
    },
    coverImage: {
        type: String,//cloudinary service url
    },
    watchHistory: [
        {
            type: Schema.Types.ObjectId,
            ref: "Video"
        }
    ],
    password: {
        type: String,
        required: [true, 'Password is required !!']
    },
    refreshToken: {
        type: String
    }
}, {
    timestamps: true
})

//hooks for password encrypt using pre hooks
//yhha pr fat arrow function ni likh skte hai kyoki this ka context ni hota hai yha
userSchema.pre("save", async function (next) {

    if (!this.isModified("password")) {
        return next();
    }
    this.password = await bcrypt.hash(this.password, 10);
    next()
})

//custom method design for check the password is correct or not
userSchema.methods.isPasswordCorrect = async function (password) {

    return await bcrypt.compare(password, this.password)
}

//custome method design generate access token
userSchema.methods.generateAccessToken = function () {
    return jwt.sign(
        {
            //payload
            _id: this._id,
            email: this.email,
            username: this.username,
            fullName: this.fullName

        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
userSchema.methods.generateRefreshToken = function () {
    return jwt.sign(
        {
            //payload
            _id: this._id,

        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}


export const User = mongoose.model("User", userSchema)
