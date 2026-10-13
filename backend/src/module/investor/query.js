import pool from "../../db/db.js";

export const findInvestorByEmail = async (email, db = pool) => {
    const [rows] = await db.query(
        "SELECT * FROM investors WHERE email = ? LIMIT 1",
        [email]
    );
    return rows[0] || null;
};

export const findInvestorByInvestorId = async (investorId, db = pool) => {
    const [rows] = await db.query(
        "SELECT * FROM investors WHERE investor_id = ? LIMIT 1",
        [investorId]
    );
    return rows[0] || null;
};

export const findInvestorByIdAndContact = async ({ investorId, contactInfo }, db = pool) => {
    const [rows] = await db.query(
        `SELECT * FROM investors
         WHERE investor_id = ?
           AND (email = ? OR whatsapp = ? OR phone = ?)
         LIMIT 1`,
        [investorId, contactInfo, contactInfo, contactInfo]
    );
    return rows[0] || null;
};

export const createInvestor = async (
    { firstName, lastName, email, whatsapp, phone, investorId, pledgeRangeLabel, pledgeMin, pledgeMax },
    db = pool
) => {
    const [result] = await db.query(
        `INSERT INTO investors
            (investor_id, first_name, last_name, email, whatsapp, phone,
             pledge_range_label, pledge_min, pledge_max)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [investorId, firstName, lastName, email, whatsapp, phone || null, pledgeRangeLabel, pledgeMin, pledgeMax]
    );
    return result.insertId;
};

// Reserves the next sequential investor ID number inside the caller's
// transaction, so two simultaneous registrations can never collide.
export const reserveNextInvestorNumber = async (db) => {
    await db.query(
        "UPDATE investor_id_sequence SET last_number = last_number + 1 WHERE id = 1"
    );
    const [rows] = await db.query(
        "SELECT last_number FROM investor_id_sequence WHERE id = 1"
    );
    return rows[0].last_number;
};

// Investments Queries
export const findInvestmentsByInvestorId = async (investorId, db = pool) => {
    const [rows] = await db.query(
        "SELECT * FROM investments WHERE investor_id = ? ORDER BY created_at DESC",
        [investorId]
    );
    return rows;
};

export const createInvestment = async (
    {
        investorId,
        referenceId,
        poolId,
        poolName,
        amount,
        apr,
        termMonths,
        estimatedYield,
        paymentMethod,
        paymentReference,
        covenantNumber,
        status = "active"
    },
    db = pool
) => {
    const [result] = await db.query(
        `INSERT INTO investments
            (investor_id, reference_id, pool_id, pool_name, amount, apr,
             term_months, estimated_yield, payment_method, payment_reference,
             covenant_number, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            investorId,
            referenceId,
            poolId,
            poolName,
            amount,
            apr,
            termMonths,
            estimatedYield,
            paymentMethod,
            paymentReference || null,
            covenantNumber,
            status
        ]
    );
    return result.insertId;
};

export const syncInvestorInvestedTotal = async (investorId, db = pool) => {
    const [stats] = await db.query(
        `SELECT COALESCE(SUM(amount), 0) AS total,
                COUNT(*) AS count
         FROM investments
         WHERE investor_id = ?`,
        [investorId]
    );
    const total = Number(stats[0]?.total || 0);
    const isInvestor = total > 0 ? 1 : 0;

    await db.query(
        `UPDATE investors
         SET total_invested = ?, is_investor = ?
         WHERE investor_id = ?`,
        [total, isInvestor, investorId]
    );
    return { total, isInvestor };
};

export const getInvestorDashboardStats = async (investorId, db = pool) => {
    const [rows] = await db.query(
        `SELECT
            COALESCE(SUM(CASE WHEN status = 'active' THEN amount ELSE 0 END), 0) AS active_portfolio,
            COALESCE(SUM(amount), 0) AS total_invested,
            COUNT(*) AS total_transactions,
            COUNT(CASE WHEN status = 'active' THEN 1 END) AS active_covenants,
            MAX(created_at) AS latest_investment_date
         FROM investments
         WHERE investor_id = ?`,
        [investorId]
    );
    return rows[0] || null;
};

// Saved Cards Queries
export const findSavedCardsByInvestorId = async (investorId, db = pool) => {
    const [rows] = await db.query(
        `SELECT id, investor_id, cardholder_name, card_number_masked,
                card_last4, card_brand, expiry_month_year, billing_country,
                is_default, created_at
         FROM saved_cards
         WHERE investor_id = ?
         ORDER BY is_default DESC, created_at DESC`,
        [investorId]
    );
    return rows;
};

export const findSavedCardByLast4 = async (investorId, cardLast4, db = pool) => {
    const [rows] = await db.query(
        `SELECT * FROM saved_cards
         WHERE investor_id = ? AND card_last4 = ?
         LIMIT 1`,
        [investorId, cardLast4]
    );
    return rows[0] || null;
};

export const createSavedCard = async (
    {
        investorId,
        cardholderName,
        cardNumberMasked,
        cardLast4,
        cardBrand,
        expiryMonthYear,
        billingCountry = "HT",
        isDefault = false
    },
    db = pool
) => {
    const [result] = await db.query(
        `INSERT INTO saved_cards
            (investor_id, cardholder_name, card_number_masked, card_last4,
             card_brand, expiry_month_year, billing_country, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            investorId,
            cardholderName,
            cardNumberMasked,
            cardLast4,
            cardBrand || "CARD",
            expiryMonthYear,
            billingCountry,
            isDefault ? 1 : 0
        ]
    );
    return result.insertId;
};

export const deleteSavedCard = async (cardId, investorId, db = pool) => {
    const [result] = await db.query(
        `DELETE FROM saved_cards
         WHERE id = ? AND investor_id = ?`,
        [cardId, investorId]
    );
    return result.affectedRows > 0;
};


export const getAllInvestmentsWithInvestors = async (db = pool) => {
    const [rows] = await db.query(
        `SELECT
            i.id,
            i.investor_id,
            i.reference_id,
            i.pool_id,
            i.pool_name,
            i.amount,
            i.apr,
            i.term_months,
            i.estimated_yield,
            i.payment_method,
            i.payment_reference,
            i.covenant_number,
            i.status,
            i.created_at,
            inv.first_name,
            inv.last_name,
            inv.email
         FROM investments i
         JOIN investors inv ON i.investor_id = inv.investor_id
         ORDER BY i.created_at DESC`
    );
    return rows;
};

export const findInvestmentByReference = async (ref, db = pool) => {
    const [rows] = await db.query(
        `SELECT
            i.id,
            i.investor_id,
            i.reference_id,
            i.pool_id,
            i.pool_name,
            i.amount,
            i.apr,
            i.term_months,
            i.estimated_yield,
            i.payment_method,
            i.payment_reference,
            i.covenant_number,
            i.status,
            i.created_at,
            inv.first_name,
            inv.last_name,
            inv.email
         FROM investments i
         JOIN investors inv ON i.investor_id = inv.investor_id
         WHERE i.reference_id = ?
         LIMIT 1`,
        [ref]
    );
    return rows[0] || null;
};

export const findLatestInvestmentByInvestorId = async (investorId, db = pool) => {
    const [rows] = await db.query(
        `SELECT
            i.id,
            i.investor_id,
            i.reference_id,
            i.pool_id,
            i.pool_name,
            i.amount,
            i.apr,
            i.term_months,
            i.estimated_yield,
            i.payment_method,
            i.payment_reference,
            i.covenant_number,
            i.status,
            i.created_at,
            inv.first_name,
            inv.last_name,
            inv.email
         FROM investments i
         JOIN investors inv ON i.investor_id = inv.investor_id
         WHERE i.investor_id = ?
         ORDER BY i.created_at DESC
         LIMIT 1`,
        [investorId]
    );
    return rows[0] || null;
};
