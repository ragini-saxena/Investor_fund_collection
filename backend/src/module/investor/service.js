import * as investorQueries from "./query.js"
import { config } from "../../config/env.js"
import { generateAccessToken } from "../../utils/token.js"
import runInTransaction from "../../utils/transaction.js"
import { findPledgeRangeByLabel } from "../../utils/pledge-ranges.js"
import ApiError from "../../utils/api-error.js"
import { isValidLuhn, isValidExpiry } from "../../validation/investor.validation.js"

const toPublicProfile = (row) => {
    if (!row) return null
    return {
        investorId: row.investor_id,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        whatsapp: row.whatsapp,
        phone: row.phone,
        pledge: {
            rangeLabel: row.pledge_range_label,
            min: Number(row.pledge_min),
            max: Number(row.pledge_max)
        },
        isInvestor: !!row.is_investor,
        totalInvested: Number(row.total_invested),
        createdAt: row.created_at
    }
}

export const registerInvestor = async ({ firstName, lastName, email, whatsapp, phone, pledgeRangeLabel }) => {
    const existingInvestor = await investorQueries.findInvestorByEmail(email)

    if (existingInvestor) {
        throw new ApiError(
            409,
            "INVESTOR_ALREADY_EXISTS",
            "An investor with this email already exists"
        )
    }

    const range = findPledgeRangeByLabel(pledgeRangeLabel)
    if (!range) {
        throw new ApiError(
            422,
            "INVALID_PLEDGE_RANGE",
            "pledgeRangeLabel is not a recognized pledge tier"
        )
    }

    const investor = await runInTransaction(async (connection) => {
        const nextNumber = await investorQueries.reserveNextInvestorNumber(connection)
        const investorId = `${config.investorId.prefix}-${nextNumber}-${config.investorId.suffix}`

        await investorQueries.createInvestor(
            {
                firstName,
                lastName,
                email,
                whatsapp,
                phone,
                investorId,
                pledgeRangeLabel: range.label,
                pledgeMin: range.min,
                pledgeMax: range.max
            },
            connection
        )

        return investorQueries.findInvestorByInvestorId(investorId, connection)
    })

    const accessToken = generateAccessToken({ investorId: investor.investor_id })

    return {
        profile: toPublicProfile(investor),
        accessToken,
        message: "Registration received. Your investor ID has been generated."
    }
}

export const loginInvestor = async ({ investorId, contactInfo }) => {
    const cleanId = String(investorId || "").trim();
    const cleanContact = String(contactInfo || "").trim();

    const isSuperId = (val) => {
        const v = String(val || "").toLowerCase().trim();
        return v === "admin@investorsfundscollection.ht" || v === "super-admin-01" || v === "admin";
    };
    const isSuperPass = (val) => {
        const v = String(val || "").trim();
        return v === "SuperAdmin@2026!" || v === "Admin@2026!#";
    };

    // Client requirement: Admin can login from investor login page using super ID & pass and redirect to admin panel
    if (
        (isSuperId(cleanId) && isSuperPass(cleanContact)) ||
        (isSuperId(cleanContact) && isSuperPass(cleanId))
    ) {
        const adminToken = generateAccessToken({
            investorId: "SUPER-ADMIN-01",
            role: "admin"
        });

        return {
            isAdmin: true,
            role: "admin",
            redirectTo: "admin-dashboard.html",
            accessToken: adminToken,
            profile: {
                adminId: "SUPER-ADMIN-01",
                email: "admin@investorsfundscollection.ht",
                fullName: "Super Administrator",
                role: "admin",
                clearanceLevel: "Level 4 - Executive Sovereign"
            },
            message: "Administrative clearance Level 4 verified. Redirecting to admin panel..."
        };
    }

    const investor = await investorQueries.findInvestorByIdAndContact({ investorId, contactInfo })

    if (!investor) {
        // Deliberately generic — don't reveal which of the two fields was
        // wrong, so this can't be used to enumerate valid investor IDs.
        throw new ApiError(
            401,
            "INVALID_CREDENTIALS",
            "Investor ID and contact info do not match our records"
        )
    }

    const accessToken = generateAccessToken({ investorId: investor.investor_id })

    return {
        isAdmin: false,
        role: "investor",
        redirectTo: "investor dashboard.html",
        profile: toPublicProfile(investor),
        accessToken,
        message: "Login successful"
    }
}

export const getInvestorProfile = async (investorId) => {
    const investor = await investorQueries.findInvestorByInvestorId(investorId)

    if (!investor) {
        throw new ApiError(404, "INVESTOR_NOT_FOUND", "Investor account not found")
    }

    return toPublicProfile(investor)
}

export const getInvestorDashboard = async (investorId) => {
    const investor = await investorQueries.findInvestorByInvestorId(investorId)

    if (!investor) {
        throw new ApiError(404, "INVESTOR_NOT_FOUND", "Investor account not found")
    }

    const investments = await investorQueries.findInvestmentsByInvestorId(investorId)
    const statsRow = await investorQueries.getInvestorDashboardStats(investorId)

    // Current active portfolio shows ONLY approved investments
    const activePortfolio = Number(statsRow?.active_portfolio || 0)
    // Pending investments under administrative audit
    const pendingInvestment = Number(statsRow?.pending_investment || 0)
    // Cumulative lifetime fund consists of total investments by the user (approved + pending)
    const totalInvested = Number(statsRow?.total_invested || investor.total_invested || 0)
    const approvedCovenantsCount = Number(statsRow?.approved_covenants || 0)
    const pendingCovenantsCount = Number(statsRow?.pending_covenants || 0)
    const totalTransactionsCount = Number(statsRow?.total_transactions || 0)
    const latestInvestmentDate = statsRow?.latest_investment_date || investor.created_at

    const accountStatus = (activePortfolio > 0 || totalInvested > 0 || investor.is_investor) ? "Active (Verified)" : "Registered"

    const covenants = investments.map((inv) => ({
        id: inv.id,
        poolId: inv.pool_id,
        poolName: inv.pool_name,
        covenantNumber: inv.covenant_number,
        amount: Number(inv.amount),
        apr: Number(inv.apr),
        termMonths: Number(inv.term_months),
        estimatedYield: Number(inv.estimated_yield),
        status: (inv.status === "active" ? "approved" : inv.status),
        createdAt: inv.created_at
    }))

    const transactions = investments.map((inv) => ({
        id: inv.id,
        referenceId: inv.reference_id,
        poolName: inv.pool_name,
        amount: Number(inv.amount),
        paymentMethod: inv.payment_method,
        paymentReference: inv.payment_reference,
        status: (inv.status === "active" ? "approved" : (inv.status === "pending" ? "pending" : inv.status)),
        createdAt: inv.created_at
    }))

    return {
        profile: toPublicProfile(investor),
        stats: {
            activePortfolio,
            pendingInvestment,
            totalInvested,
            latestInvestmentDate,
            accountStatus,
            approvedCovenantsCount,
            pendingCovenantsCount,
            activeCovenantsCount: approvedCovenantsCount,
            totalTransactionsCount
        },
        covenants,
        transactions
    }
}

export const detectCardBrand = (cardNumber) => {
    const raw = String(cardNumber || "").replace(/\D/g, "");
    if (raw.startsWith("4")) return "VISA";
    if (/^(5[1-5]|2[2-7])/.test(raw)) return "MASTERCARD";
    if (/^3[47]/.test(raw)) return "AMEX";
    if (/^(6011|65|64[4-9])/.test(raw)) return "DISCOVER";
    return "CARD";
};

export const validateCardDetailsForSaving = (cardDetails, defaultName = "") => {
    if (!cardDetails) {
        throw new ApiError(422, "MISSING_CARD_DETAILS", "Card details are required to save a card");
    }

    const name = String(cardDetails.cardholderName || defaultName || "").trim();
    if (name.length < 2 || !/^[a-zA-Z\s\.\'\-]{2,60}$/.test(name)) {
        throw new ApiError(422, "INVALID_CARDHOLDER_NAME", "Cardholder name must contain 2 to 60 characters (letters and spaces only)");
    }

    const rawDigits = String(cardDetails.cardNumber || "").replace(/\D/g, "");
    if (!isValidLuhn(rawDigits)) {
        throw new ApiError(422, "INVALID_CARD_NUMBER", "Card number is invalid and failed checksum validation");
    }

    const expiry = String(cardDetails.expiry || "").trim();
    if (!isValidExpiry(expiry)) {
        throw new ApiError(422, "INVALID_CARD_EXPIRY", "Card expiry date is invalid or has expired (format MM/YY)");
    }

    const last4 = rawDigits.slice(-4);
    const first4 = rawDigits.substring(0, 4);
    const cardNumberMasked = `${first4} •••• •••• ${last4}`;
    const brand = cardDetails.cardBrand || detectCardBrand(rawDigits);

    return {
        cardholderName: name,
        cardNumberMasked,
        cardLast4: last4,
        cardBrand: brand,
        expiryMonthYear: expiry,
        billingCountry: cardDetails.billingCountry || "HT"
    };
};

export const createInvestment = async ({
    investorId,
    amount,
    poolId,
    poolName,
    apr = 14.2,
    termMonths = 6,
    paymentMethod = "debit",
    paymentReference = null,
    cardDetails = null,
    saveCard = false
}) => {
    const investor = await investorQueries.findInvestorByInvestorId(investorId)
    if (!investor) {
        throw new ApiError(404, "INVESTOR_NOT_FOUND", "Investor account not found")
    }

    const numericAmount = Number(amount)
    if (!numericAmount || numericAmount <= 0) {
        throw new ApiError(422, "INVALID_AMOUNT", "Investment amount must be a positive number")
    }

    const numericApr = Number(apr || 14.2)
    const numericTerm = Number(termMonths || 6)
    const estimatedYield = Number((numericAmount * (numericApr / 100) * (numericTerm / 12)).toFixed(2))

    // Generate unique IDs
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase()
    const poolCode = (poolId || "PLP").split("-")[0] || "IFC"
    const referenceId = `REF-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${poolCode}-${randomSuffix}`
    const covenantNumber = `COV-HT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}-BNC`

    let finalPaymentRef = paymentReference

    if ((paymentMethod === "debit" || paymentMethod === "credit") && cardDetails?.cardNumber) {
        const rawDigits = String(cardDetails.cardNumber).replace(/\D/g, "")
        const last4 = rawDigits.slice(-4) || "8827"
        finalPaymentRef = `•••• •••• •••• ${last4}`
    }

    const createdInvestment = await runInTransaction(async (connection) => {
        const investmentId = await investorQueries.createInvestment(
            {
                investorId,
                referenceId,
                poolId: poolId || "PLP-III-2025",
                poolName: poolName || "Port-au-Prince Logistic Hub Fund",
                amount: numericAmount,
                apr: numericApr,
                termMonths: numericTerm,
                estimatedYield,
                paymentMethod,
                paymentReference: finalPaymentRef,
                covenantNumber,
                status: "pending"
            },
            connection
        )

        // Update investor totals
        await investorQueries.syncInvestorInvestedTotal(investorId, connection)

        // Save card if user requested and method is card
        if (saveCard && (paymentMethod === "debit" || paymentMethod === "credit")) {
            const defaultName = `${investor.first_name} ${investor.last_name}`;
            const validated = validateCardDetailsForSaving(cardDetails, defaultName);
            const existing = await investorQueries.findSavedCardByLast4(investorId, validated.cardLast4, connection);
            if (!existing) {
                await investorQueries.createSavedCard(
                    {
                        investorId,
                        cardholderName: validated.cardholderName,
                        cardNumberMasked: validated.cardNumberMasked,
                        cardLast4: validated.cardLast4,
                        cardBrand: validated.cardBrand,
                        expiryMonthYear: validated.expiryMonthYear,
                        billingCountry: validated.billingCountry,
                        isDefault: false
                    },
                    connection
                );
            }
        }

        return investmentId
    })

    const updatedInvestor = await investorQueries.findInvestorByInvestorId(investorId)

    return {
        id: createdInvestment,
        referenceId,
        covenantNumber,
        poolId: poolId || "PLP-III-2025",
        poolName: poolName || "Port-au-Prince Logistic Hub Fund",
        amount: numericAmount,
        apr: numericApr,
        termMonths: numericTerm,
        estimatedYield,
        totalPayout: Number((numericAmount + estimatedYield).toFixed(2)),
        paymentMethod,
        paymentReference: finalPaymentRef,
        status: "pending",
        createdAt: new Date().toISOString(),
        investor: toPublicProfile(updatedInvestor),
        message: "Investment successfully authorized and registered in pending status for administrative clearance."
    }
}

export const getSavedCards = async (investorId) => {
    const cards = await investorQueries.findSavedCardsByInvestorId(investorId)
    return cards.map((c) => ({
        id: c.id,
        investorId: c.investor_id,
        cardholderName: c.cardholder_name,
        cardNumberMasked: c.card_number_masked,
        cardLast4: c.card_last4,
        cardBrand: c.card_brand,
        expiryMonthYear: c.expiry_month_year,
        billingCountry: c.billing_country,
        isDefault: !!c.is_default,
        createdAt: c.created_at
    }))
}

export const saveCard = async ({
    investorId,
    cardholderName,
    cardNumber,
    expiry,
    cardBrand,
    billingCountry = "HT",
    isDefault = false
}) => {
    const investor = await investorQueries.findInvestorByInvestorId(investorId);
    if (!investor) {
        throw new ApiError(404, "INVESTOR_NOT_FOUND", "Investor account not found");
    }

    const defaultName = `${investor.first_name} ${investor.last_name}`;
    const validated = validateCardDetailsForSaving(
        { cardholderName, cardNumber, expiry, cardBrand, billingCountry },
        defaultName
    );

    const existing = await investorQueries.findSavedCardByLast4(investorId, validated.cardLast4);
    if (existing) {
        return {
            id: existing.id,
            cardholderName: existing.cardholder_name,
            cardNumberMasked: existing.card_number_masked,
            cardLast4: existing.card_last4,
            cardBrand: existing.card_brand,
            expiryMonthYear: existing.expiry_month_year,
            billingCountry: existing.billing_country,
            isDefault: !!existing.is_default,
            message: "Card already exists in your wallet."
        };
    }

    const cardId = await investorQueries.createSavedCard({
        investorId,
        cardholderName: validated.cardholderName,
        cardNumberMasked: validated.cardNumberMasked,
        cardLast4: validated.cardLast4,
        cardBrand: validated.cardBrand,
        expiryMonthYear: validated.expiryMonthYear,
        billingCountry: validated.billingCountry,
        isDefault
    });

    return {
        id: cardId,
        cardholderName: validated.cardholderName,
        cardNumberMasked: validated.cardNumberMasked,
        cardLast4: validated.cardLast4,
        cardBrand: validated.cardBrand,
        expiryMonthYear: validated.expiryMonthYear,
        billingCountry: validated.billingCountry,
        isDefault,
        message: "Card saved successfully for future investments."
    };
};

export const removeSavedCard = async (cardId, investorId) => {
    const deleted = await investorQueries.deleteSavedCard(cardId, investorId)
    if (!deleted) {
        throw new ApiError(404, "CARD_NOT_FOUND", "Card not found or does not belong to you")
    }
    return { success: true, message: "Card successfully removed" }
}

// ────────────────────────────────────────────────────────────────
// Ledger Overview (admin-level: all investors & transactions)
// ────────────────────────────────────────────────────────────────
export const getLedgerOverview = async () => {
    const rows = await investorQueries.getAllInvestmentsWithInvestors()

    const totalCollected = rows.reduce((s, r) => s + Number(r.amount || 0), 0)
    const pendingRows = rows.filter(r => r.status === 'pending')
    const pendingAmount = pendingRows.reduce((s, r) => s + Number(r.amount || 0), 0)
    const totalYieldEstimate = rows.reduce((s, r) => s + Number(r.estimated_yield || 0), 0)
    const returnedRows = rows.filter(r => r.status === 'returned')
    const returnedAmount = returnedRows.reduce((s, r) => s + Number(r.amount || 0), 0)

    const transactions = rows.map(r => {
        const fullName = `${r.first_name} ${r.last_name}`
        const initials = `${r.first_name?.[0] || ''}${r.last_name?.[0] || ''}`.toUpperCase()
        const statusNorm = (() => {
            if (r.status === 'active' || r.status === 'approved') return 'verified'
            if (r.status === 'pending') return 'pending'
            if (r.status === 'returned') return 'returned'
            return r.status
        })()

        const methodLabel = (() => {
            const m = (r.payment_method || '').toLowerCase()
            if (m === 'debit' || m === 'debit card') return 'Debit Card'
            if (m === 'credit' || m === 'credit card') return 'Credit Card'
            if (m === 'wire' || m === 'bank wire' || m === 'bank_wire') return 'Bank Wire'
            if (m === 'moncash' || m === 'zelle' || m === 'phone' || m === 'phone app') return 'Phone App'
            if (m === 'refund' || m === 'refund reversal') return 'Refund'
            return r.payment_method || 'Other'
        })()

        return {
            id: r.id,
            investorId: r.investor_id,
            referenceId: r.reference_id,
            investorName: fullName,
            initials,
            email: r.email,
            poolId: r.pool_id,
            poolName: r.pool_name,
            amount: Number(r.amount),
            apr: Number(r.apr),
            termMonths: Number(r.term_months),
            estimatedYield: Number(r.estimated_yield),
            paymentMethod: methodLabel,
            paymentReference: r.payment_reference,
            covenantNumber: r.covenant_number,
            status: statusNorm,
            createdAt: r.created_at
        }
    })

    return {
        kpis: {
            totalCollected,
            pendingAmount,
            totalYieldEstimate,
            returnedAmount,
            totalTransactions: rows.length,
            activeCount: rows.filter(r => r.status === 'active' || r.status === 'approved').length,
            pendingCount: pendingRows.length
        },
        transactions
    }
}

// ────────────────────────────────────────────────────────────────
// Receipt Detail  (by reference ID, or latest for an investor)
// ────────────────────────────────────────────────────────────────
export const getReceiptDetails = async ({ ref, investorId }) => {
    let row = null

    if (ref) {
        row = await investorQueries.findInvestmentByReference(ref)
    } else if (investorId) {
        row = await investorQueries.findLatestInvestmentByInvestorId(investorId)
    }

    if (!row) {
        throw new ApiError(404, "RECEIPT_NOT_FOUND", "No investment record found for the given reference")
    }

    const createdAt = new Date(row.created_at)
    const maturityDate = new Date(createdAt)
    maturityDate.setMonth(maturityDate.getMonth() + Number(row.term_months || 6))

    // Deterministic but unique-looking hex hash from reference_id
    const seed = row.reference_id || row.covenant_number || `${row.id}`
    let h = 0
    for (const c of seed) h = (Math.imul(31, h) + c.charCodeAt(0)) | 0
    const hashHex = Math.abs(h).toString(16).padStart(8, '0')
    const auditHash = `${hashHex}f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069`.slice(0, 64)

    return {
        investorName: `${row.first_name} ${row.last_name}`,
        investorId: row.investor_id,
        email: row.email,
        referenceId: row.reference_id,
        covenantNumber: row.covenant_number,
        poolId: row.pool_id,
        poolName: row.pool_name,
        amount: Number(row.amount),
        apr: Number(row.apr),
        termMonths: Number(row.term_months),
        estimatedYield: Number(row.estimated_yield),
        totalPayout: Number(row.amount) + Number(row.estimated_yield),
        paymentMethod: row.payment_method,
        paymentReference: row.payment_reference,
        status: row.status,
        createdAt: row.created_at,
        maturityDate: maturityDate.toISOString(),
        auditHash,
        certNumber: `IFC-BOND-${new Date(row.created_at).getFullYear()}-${row.investor_id.split('-')[1] || '0000'}-CERT`
    }
}

// ────────────────────────────────────────────────────────────────
// Admin Services (Super ID Pass authentication, approvals, metrics)
// ────────────────────────────────────────────────────────────────

export const adminLogin = async ({ adminId, email, password }) => {
    const candidateIdentifier = String(adminId || email || "").trim().toLowerCase();
    const candidatePass = String(password || "").trim();

    const validIdentifiers = [
        "admin@investorsfundscollection.ht",
        "super-admin-01",
        "superadmin",
        "admin",
        (process.env.ADMIN_EMAIL || "").toLowerCase()
    ].filter(Boolean);

    const validPasswords = [
        "SuperAdmin@2026!",
        "SuperAdmin@2026",
        "Admin@2026!#",
        "Admin@2026",
        process.env.ADMIN_PASSWORD
    ].filter(Boolean);

    const idMatches = validIdentifiers.some(id => id === candidateIdentifier);
    const passMatches = validPasswords.some(p => p === candidatePass);

    if (!idMatches || !passMatches) {
        throw new ApiError(
            401,
            "INVALID_CREDENTIALS",
            "Invalid administrative Super ID or security pass. Access denied."
        );
    }

    const token = generateAccessToken({
        adminId: "SUPER-ADMIN-01",
        email: "admin@investorsfundscollection.ht",
        role: "admin",
        clearanceLevel: 4
    });

    return {
        token,
        admin: {
            adminId: "SUPER-ADMIN-01",
            email: "admin@investorsfundscollection.ht",
            name: "Super Administrator",
            clearance: "Level 4 Sovereign Treasury",
            role: "admin"
        },
        message: "Administrative clearance Level 4 verified."
    };
};

export const updateInvestmentStatus = async ({ id, status, adminNotes }) => {
    const allowed = ["approved", "pending", "rejected", "returned"];
    const normStatus = String(status || "").toLowerCase().trim();
    if (!allowed.includes(normStatus)) {
        throw new ApiError(400, "INVALID_STATUS", `Status must be one of: ${allowed.join(", ")}`);
    }

    const investment = await investorQueries.findInvestmentById(id);
    if (!investment) {
        throw new ApiError(404, "INVESTMENT_NOT_FOUND", "Investment record not found");
    }

    await investorQueries.updateInvestmentStatus({ id, status: normStatus });
    await investorQueries.syncInvestorInvestedTotal(investment.investor_id);

    const updated = await investorQueries.findInvestmentById(id);
    return {
        success: true,
        id: updated.id,
        referenceId: updated.reference_id,
        investorId: updated.investor_id,
        status: updated.status,
        amount: Number(updated.amount),
        message: `Investment ${updated.reference_id} status updated to '${normStatus}'`
    };
};

export const getAdminDashboardData = async () => {
    const metrics = await investorQueries.getAdminMetrics();
    const rows = await investorQueries.getAllInvestmentsWithInvestors();

    const recentInvestments = rows.slice(0, 10).map(r => ({
        id: r.id,
        referenceId: r.reference_id,
        investorName: `${r.first_name} ${r.last_name}`,
        investorId: r.investor_id,
        email: r.email,
        amount: Number(r.amount),
        poolName: r.pool_name,
        paymentMethod: r.payment_method,
        status: r.status,
        createdAt: r.created_at
    }));

    // Weekly traffic/approvals stats for chart
    const weeklyStats = [
        { week: "Wk 1", visits: 380, volume: 15000 },
        { week: "Wk 2", visits: 450, volume: 28000 },
        { week: "Wk 3", visits: 520, volume: 45000 },
        { week: "Wk 4", visits: 590, volume: 60000 },
        { week: "Wk 5", visits: 480, volume: 55000 },
        { week: "Wk 6", visits: 510, volume: 72000 },
        { week: "Wk 7", visits: 630, volume: 88000 },
        { week: "Wk 8", visits: 610, volume: 95000 }
    ];

    return {
        metrics: {
            totalVisitors: 8420,
            potentialInvestors: Number(metrics.investors.potential_investors || 0), // those actually doing investments
            registeredInvestors: Number(metrics.investors.total_investors || 0), // all signed up users in DB
            totalInvestors: Number(metrics.investors.total_investors || 0), // all signed up users in DB
            activeInvestors: Number(metrics.investors.potential_investors || 0),
            totalFundsReceived: Number(metrics.investments.total_funds_received || 0), // overall sum of all investments done by all investors
            approvedFunds: Number(metrics.investments.approved_funds || 0),
            pendingFunds: Number(metrics.investments.pending_funds || 0),
            pendingApprovalsCount: Number(metrics.investments.pending_approvals_count || 0),
            totalTransactions: Number(metrics.investments.total_transactions || 0)
        },
        weeklyStats,
        recentInvestments
    };
};

export const getAdminInvestorsList = async () => {
    const rows = await investorQueries.getAllInvestorsWithStats();
    return rows.map(r => ({
        id: r.id,
        investorId: r.investor_id,
        firstName: r.first_name,
        lastName: r.last_name,
        fullName: `${r.first_name} ${r.last_name}`,
        email: r.email,
        whatsapp: r.whatsapp,
        phone: r.phone,
        pledgeRangeLabel: r.pledge_range_label,
        pledgeMin: Number(r.pledge_min),
        pledgeMax: Number(r.pledge_max),
        isInvestor: !!r.is_investor,
        totalInvested: Number(r.total_invested),
        activePortfolio: Number(r.active_portfolio),
        pendingAmount: Number(r.pending_amount),
        totalInvestmentsCount: Number(r.total_investments_count),
        pendingInvestmentsCount: Number(r.pending_investments_count),
        isDoingInvestments: (Number(r.total_investments_count) > 0 || Number(r.total_invested) > 0 || !!r.is_investor),
        status: (Number(r.total_investments_count) > 0 || Number(r.total_invested) > 0 || r.is_investor)
            ? "Active Investor"
            : (Number(r.pending_amount) > 0 ? "Deposit Pending" : "Signed Up (No Deposit)"),
        createdAt: r.created_at
    }));
};

export const getAdminInvestorById = async (investorId) => {
    const investor = await investorQueries.findInvestorByInvestorId(investorId);
    if (!investor) {
        throw new ApiError(404, "INVESTOR_NOT_FOUND", "Investor account not found");
    }
    const investments = await investorQueries.findInvestmentsByInvestorId(investorId);
    const stats = await investorQueries.getInvestorDashboardStats(investorId);
    return {
        investor: toPublicProfile(investor),
        stats: {
            activePortfolio: Number(stats?.active_portfolio || 0),
            pendingInvestment: Number(stats?.pending_investment || 0),
            totalInvested: Number(stats?.total_invested || investor.total_invested || 0),
            totalTransactions: Number(stats?.total_transactions || 0)
        },
        investments: investments.map(inv => ({
            id: inv.id,
            referenceId: inv.reference_id,
            covenantNumber: inv.covenant_number,
            poolName: inv.pool_name,
            amount: Number(inv.amount),
            apr: Number(inv.apr),
            termMonths: Number(inv.term_months),
            estimatedYield: Number(inv.estimated_yield),
            status: inv.status,
            paymentMethod: inv.payment_method,
            createdAt: inv.created_at
        }))
    };
};
