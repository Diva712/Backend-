//asyncHandler by using promises
const asyncHandler = (requestHandler) => {
    (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err))
    }
}




export { asyncHandler }


// const asyncHandler = () => { }
// const asyncHAndler = (func) => () => { }
// const asyncHandler = (func) => async ()=>{ }


//async handler by trycatch

// const asyncHandler = (fn) => {
//     async (req, res, next) => {

//         try {

//             await fn(req, res, next)

//         } catch (error) {
//             res.status(err.code || 500).json({
//                 success: false,
//                 message: err.message
//             })
//         }
//     }
// }