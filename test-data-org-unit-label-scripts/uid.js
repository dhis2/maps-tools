const crypto = require('node:crypto')

const ALPHABET =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
const LETTERS = ALPHABET.slice(0, 52)

// Deterministically derives a valid DHIS2 UID (^[A-Za-z][A-Za-z0-9]{10}$) from
// a seed string, so re-running the generator script always produces the same
// ids and DHIS2's CREATE_AND_UPDATE import updates objects in place instead
// of creating duplicates.
const deterministicUid = (seed) => {
    const hash = crypto.createHash('sha256').update(seed).digest()

    let uid = LETTERS[hash[0] % LETTERS.length]
    for (let i = 1; i < 11; i++) {
        uid += ALPHABET[hash[i] % ALPHABET.length]
    }
    return uid
}

module.exports = { deterministicUid }
