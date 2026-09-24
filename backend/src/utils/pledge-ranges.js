/**
 * Pledge tiers — single source of truth for validation + storage.
 *
 * NOTE: these 10 ranges match what is actually live in the frontend's
 * register (2).html today. The client's original written spec listed
 * only 6 tiers ($20–200, $300–500, $600–800, $900–1,000, $1,100–5,000,
 * $5,100+) — flagged during frontend QA and never corrected before
 * hand-off. If the client confirms the 6-tier spec is the correct one,
 * update this array (and register (2).html's rangeList markup) together.
 */
export const PLEDGE_RANGES = [
    { label: "$100–$200", min: 100, max: 200 },
    { label: "$300–$500", min: 300, max: 500 },
    { label: "$600–$800", min: 600, max: 800 },
    { label: "$900–$1,000", min: 900, max: 1000 },
    { label: "$1,100–$1,500", min: 1100, max: 1500 },
    { label: "$1,600–$2,000", min: 1600, max: 2000 },
    { label: "$2,100–$2,500", min: 2100, max: 2500 },
    { label: "$2,600–$3,000", min: 2600, max: 3000 },
    { label: "$3,100–$5,000", min: 3100, max: 5000 },
    { label: "$5,100 or more", min: 5100, max: 999999999 }
]

export const findPledgeRangeByLabel = (label) => {
    return PLEDGE_RANGES.find((r) => r.label === label) || null
}
