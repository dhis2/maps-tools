// The PTT user's password, one per instance, kept in output/ (gitignored)
// so verify.js can sign in as that user after index.js created it.
const crypto = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const { USERNAME } = require('./groups/org-units/user-org-units.js')

const DIR = path.join(__dirname, 'output', 'users')
const fileOf = (instance) => path.join(DIR, `${instance}.json`)

const readUserCredentials = (instance) => {
    const file = fileOf(instance)
    return fs.existsSync(file)
        ? JSON.parse(fs.readFileSync(file, 'utf8'))
        : null
}

// Upper and lower case, digits and a symbol: every version's policy.
const newPassword = () =>
    `Ptt-${crypto.randomBytes(12).toString('base64url')}-9a!`

const userCredentials = (instance) => {
    const existing = readUserCredentials(instance)
    if (existing) {
        return existing
    }
    const credentials = { username: USERNAME, password: newPassword() }
    fs.mkdirSync(DIR, { recursive: true })
    fs.writeFileSync(fileOf(instance), JSON.stringify(credentials, null, 2))
    return credentials
}

// Users in a metadata payload, with the password set.
const withPassword = (metadata, { password }) =>
    metadata.users
        ? {
              ...metadata,
              users: metadata.users.map((user) => ({ ...user, password })),
          }
        : metadata

module.exports = { readUserCredentials, userCredentials, withPassword }
