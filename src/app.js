import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import bodyParser from 'body-parser';



const app = express()



//major middlewares configuration 
//read karna hai
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(bodyParser.json());
//data ko jason ke form me easily accept kar ske
app.use(express.json({
    limit: "16kb"
}))

//data url ke form bhi aa skta hainpm
app.use(express.urlencoded())
app.use(cookieParser()) // user ke browser ki cookie access kr pau server s isliye use hota hai
//assests store kar skte hai
app.use(express.static("public"))



//routes import
import userRouter from "./routes/user.Routes.js"



//routes declaration
app.use("/api/v1/users", userRouter)







export { app }