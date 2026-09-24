import * as investorQueries from "./query.js"
import { config } from "../../config/env.js"
import { generateAccessToken } from "../../utils/token.js"
import runInTransaction from "../../utils/transaction.js"
import { findPledgeRangeByLabel } from "../../utils/pledge-ranges.js"
import ApiError from "../../utils/api-error.js"

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
