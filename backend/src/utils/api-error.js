class ApiError extends Error {
    constructor(statusCode, code, message) {
        super(message)
        this.statusCode = statusCode
        this.code = code
        this.isOperational = true

        Error.captureStackTrace(this, this.constructor)
    }
}

export default ApiError
