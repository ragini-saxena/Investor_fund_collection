import * as investorService from "./service.js"

export const register = async (req, res, next) => {
    try {
        const result = await investorService.registerInvestor(req.body);

        return res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req, res, next) => {
    try {
        const result = await investorService.loginInvestor(req.body);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getMe = async (req, res, next) => {
    try {
        const result = await investorService.getInvestorProfile(req.investor.investorId);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};
