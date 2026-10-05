const crypto = require('node:crypto')

const ALPHABET =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const LETTERS = ALPHABET.slice(0, 52)

// Every object this tool owns has its id seeded with this prefix. Bump the
// version to get a fresh set of ids.
const SEED_PREFIX = 'period-types-test:v1:'

// A valid DHIS2 UID (^[A-Za-z][A-Za-z0-9]{10}$) from a SHA-256 of the seed,
// so re-running the import updates objects in place instead of duplicating.
const deterministicUid = (seed) => {
    const hash = crypto.createHash('sha256').update(seed).digest()

    let uid = LETTERS[hash[0] % LETTERS.length]
    for (let i = 1; i < 11; i++) {
        uid += ALPHABET[hash[i] % ALPHABET.length]
    }
    return uid
}

const uid = (key) => deterministicUid(`${SEED_PREFIX}${key}`)

module.exports = { SEED_PREFIX, deterministicUid, uid }
