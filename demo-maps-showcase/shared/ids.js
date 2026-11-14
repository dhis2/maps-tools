const { deterministicUid } = require('../uid.js')

// Every object the tool creates has a uid from a seed and a SHOW_ code, so
// re-runs update in place and the objects are easy to find on a server
const uid = (seed) => deterministicUid(`demo-maps-showcase:${seed}`)

const CODE_PREFIX = 'SHOW_'
const SYNTHETIC_LABEL = 'Synthetic data'

const code = (suffix) => `${CODE_PREFIX}${suffix}`

const PUBLIC_READ = { public: 'r-------', external: false }

// Data sets: everyone reads their data; the user running the tool writes it
const dataSetSharing = (importerId) => ({
    public: 'r-r-----',
    external: false,
    users: { [importerId]: { id: importerId, access: 'rwrw----' } },
})

module.exports = {
    CODE_PREFIX,
    PUBLIC_READ,
    dataSetSharing,
    SYNTHETIC_LABEL,
    code,
    uid,
}
