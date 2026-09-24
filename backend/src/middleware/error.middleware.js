
const errorHandler = (err, req, res, next) => {
    console.log(err)

    const statusCode = err.statusCode || 500

    return res.status(statusCode).json({
        success: false,
        code: err.code || "INTERNAL_SERVER_ERROR",
        message: err.message || "Something went wrong"
    })
}


export default errorHandler
