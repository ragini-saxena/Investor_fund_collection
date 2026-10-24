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

export const getDashboard = async (req, res, next) => {
    try {
        const result = await investorService.getInvestorDashboard(req.investor.investorId);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const makeInvestment = async (req, res, next) => {
    try {
        const result = await investorService.createInvestment({
            ...req.body,
            investorId: req.investor.investorId
        });

        return res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getSavedCards = async (req, res, next) => {
    try {
        const result = await investorService.getSavedCards(req.investor.investorId);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const saveCard = async (req, res, next) => {
    try {
        const result = await investorService.saveCard({
            ...req.body,
            investorId: req.investor.investorId
        });

        return res.status(201).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const removeCard = async (req, res, next) => {
    try {
        const cardId = Number(req.params.id);
        const result = await investorService.removeSavedCard(cardId, req.investor.investorId);

        return res.status(200).json({
            success: true,
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const getLedger = async (req, res, next) => {
    try {
        const result = await investorService.getLedgerOverview();
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const getReceipt = async (req, res, next) => {
    try {
        const ref = req.query.ref || null;
        // Allow fetching latest for logged-in investor when no ref given
        const investorId = (!ref && req.investor) ? req.investor.investorId : null;
        const result = await investorService.getReceiptDetails({ ref, investorId });
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const adminLogin = async (req, res, next) => {
    try {
        const result = await investorService.adminLogin(req.body);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const updateInvestmentStatus = async (req, res, next) => {
    try {
        const id = req.params.id;
        const { status, adminNotes } = req.body;
        const result = await investorService.updateInvestmentStatus({ id, status, adminNotes });
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const getAdminStats = async (req, res, next) => {
    try {
        const result = await investorService.getAdminDashboardData();
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const getAdminInvestors = async (req, res, next) => {
    try {
        const result = await investorService.getAdminInvestorsList();
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

export const getAdminInvestorDetails = async (req, res, next) => {
    try {
        const investorId = req.params.id;
        const result = await investorService.getAdminInvestorById(investorId);
        return res.status(200).json({ success: true, data: result });
    } catch (error) {
        next(error);
    }
};

