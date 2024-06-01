import { Router } from "express";
import { changeCurrentPassword, getCurrentUser, loginUser, logoutUser, refreshedAccessToken, registerUser, updateAccountDetails, } from "../controllers/user.Controller.js"
import { upload } from "../middlewares/multer.Middleware.js";
import { verifyJWT } from "../middlewares/auth.Middleware.js";

const router = Router();

router.route("/register").post(
    upload.fields(
        [
            {
                name: "avatar", // frontend me bhi same name hona chhaiye avatar
                maxCount: 1
            },
            {
                name: "coverImage",
                maxCount: 1
            }
        ]
    )
    ,
    registerUser
)
router.route("/login").post(loginUser)

//secured Routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token").post(refreshedAccessToken)
router.route("/change-password").post(changeCurrentPassword)
router.route("/getcurrentuser").get(getCurrentUser)
router.route("/update").put(updateAccountDetails)











export default router