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
