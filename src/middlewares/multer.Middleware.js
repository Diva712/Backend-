import multer from "multer";

const storage = multer.diskStorage({

    destination: function (req, res, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname) // here we have to add unique name of files
    }
})

export const upload = multer({
    storage: storage,
})