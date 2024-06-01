import { Router } from "express";
import { loginUser, logoutUser, refreshedAccessToken, registerUser } from "../controllers/user.Controller.js"
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











export default router