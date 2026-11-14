const crypto = require('node:crypto')

// Seeded random numbers, so the same seed always gives the same data and a
// re-run updates values in place
const createRandom = (seed) => {
    let state = crypto
        .createHash('sha256')
        .update(seed)
        .digest()
        .readUInt32LE(0)

    // mulberry32
    const next = () => {
        state = (state + 0x6d2b79f5) | 0
        let t = Math.imul(state ^ (state >>> 15), 1 | state)
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }

    return {
        next,
        between: (min, max) => min + (max - min) * next(),
        chance: (probability) => next() < probability,
        int: (min, max) => Math.floor(min + (max - min + 1) * next()),
    }
}

// One generator per seed path, for example randomFor('post1', facilityId, period)
const randomFor = (...parts) => createRandom(parts.join(':'))

module.exports = { createRandom, randomFor }
