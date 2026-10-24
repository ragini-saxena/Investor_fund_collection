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
        status = "pending"
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
        `SELECT
            COALESCE(SUM(amount), 0) AS total_lifetime,
            COALESCE(SUM(CASE WHEN status IN ('approved', 'active') THEN amount ELSE 0 END), 0) AS approved_total,
            COUNT(CASE WHEN status IN ('approved', 'active') THEN 1 END) AS approved_count,
            COUNT(*) AS count
         FROM investments
         WHERE investor_id = ?`,
        [investorId]
    );
    const totalLifetime = Number(stats[0]?.total_lifetime || 0);
    const approvedTotal = Number(stats[0]?.approved_total || 0);
    const isInvestor = (approvedTotal > 0 || totalLifetime > 0) ? 1 : 0;

    await db.query(
        `UPDATE investors
         SET total_invested = ?, is_investor = ?
         WHERE investor_id = ?`,
        [totalLifetime, isInvestor, investorId]
    );
    return { total: totalLifetime, approvedTotal, isInvestor };
};

export const getInvestorDashboardStats = async (investorId, db = pool) => {
    const [rows] = await db.query(
        `SELECT
            COALESCE(SUM(CASE WHEN status IN ('approved', 'active') THEN amount ELSE 0 END), 0) AS active_portfolio,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_investment,
            COALESCE(SUM(amount), 0) AS total_invested,
            COUNT(*) AS total_transactions,
            COUNT(CASE WHEN status IN ('approved', 'active') THEN 1 END) AS approved_covenants,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_covenants,
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

export const updateInvestmentStatus = async ({ id, status }, db = pool) => {
    const isNumeric = !isNaN(Number(id));
    const query = isNumeric
        ? `UPDATE investments SET status = ?, updated_at = NOW() WHERE id = ?`
        : `UPDATE investments SET status = ?, updated_at = NOW() WHERE reference_id = ?`;

    const [result] = await db.query(query, [status, id]);
    return result.affectedRows > 0;
};

export const findInvestmentById = async (id, db = pool) => {
    const isNumeric = !isNaN(Number(id));
    const query = isNumeric
        ? `SELECT * FROM investments WHERE id = ? LIMIT 1`
        : `SELECT * FROM investments WHERE reference_id = ? LIMIT 1`;
    const [rows] = await db.query(query, [id]);
    return rows[0] || null;
};

export const getAllInvestorsWithStats = async (db = pool) => {
    const [rows] = await db.query(
        `SELECT
            inv.id,
            inv.investor_id,
            inv.first_name,
            inv.last_name,
            inv.email,
            inv.whatsapp,
            inv.phone,
            inv.pledge_range_label,
            inv.pledge_min,
            inv.pledge_max,
            inv.is_investor,
            inv.total_invested,
            inv.created_at,
            COALESCE(SUM(CASE WHEN i.status IN ('approved', 'active') THEN i.amount ELSE 0 END), 0) AS active_portfolio,
            COALESCE(SUM(CASE WHEN i.status = 'pending' THEN i.amount ELSE 0 END), 0) AS pending_amount,
            COUNT(i.id) AS total_investments_count,
            COUNT(CASE WHEN i.status = 'pending' THEN 1 END) AS pending_investments_count
         FROM investors inv
         LEFT JOIN investments i ON inv.investor_id = i.investor_id
         GROUP BY inv.id
         ORDER BY inv.created_at DESC`
    );
    return rows;
};

export const getAdminMetrics = async (db = pool) => {
    // Total investors = count of all signed up users in the database
    const [invRows] = await db.query(
        `SELECT
            COUNT(*) AS total_investors,
            COUNT(CASE WHEN total_invested > 0 OR is_investor = 1 THEN 1 END) AS registered_active_investors
         FROM investors`
    );

    // Potential investors = those who are actually doing investments
    const [investingRows] = await db.query(
        `SELECT COUNT(DISTINCT investor_id) AS potential_investors_investing
         FROM investments
         WHERE amount > 0`
    );

    // Total funds = overall sum of all investments done by all investors
    const [transRows] = await db.query(
        `SELECT
            COALESCE(SUM(amount), 0) AS total_funds_received,
            COALESCE(SUM(CASE WHEN status IN ('approved', 'active') THEN amount ELSE 0 END), 0) AS approved_funds,
            COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) AS pending_funds,
            COALESCE(SUM(CASE WHEN status = 'returned' THEN amount ELSE 0 END), 0) AS returned_funds,
            COUNT(*) AS total_transactions,
            COUNT(CASE WHEN status = 'pending' THEN 1 END) AS pending_approvals_count,
            COUNT(CASE WHEN status IN ('approved', 'active') THEN 1 END) AS approved_transactions_count
         FROM investments`
    );

    const totalSignedUp = Number(invRows[0]?.total_investors || 0);
    const actuallyInvesting = Number(investingRows[0]?.potential_investors_investing || 0);

    return {
        investors: {
            total_investors: totalSignedUp, // count of all signed up users
            potential_investors: actuallyInvesting, // those who are actually doing investments
            registered_active_investors: Number(invRows[0]?.registered_active_investors || 0)
        },
        investments: transRows[0] || {}
    };
};
