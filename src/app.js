import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"




const app = express()



//major middlewares configuration 
//read karna hai
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
//data ko jason ke form me easily accept kar ske
app.use(express.json({
    limit: "16kb"
}))
//data url ke form bhi aa skta hai
app.use(express.urlencoded({
    extended: true,
    limit: "16kb"
}))
app.use(cookieParser()) // user ke browser ki cookie access kr pau server s isliye use hota hai
//assests store kar skte hai
app.use(express.static("public"))



//routes import
import userRouter from "./routes/user.Routes.js"



//routes declaration
app.use("/api/v1/users", userRouter)







export { app }