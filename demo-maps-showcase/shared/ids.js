const { deterministicUid } = require('../uid.js')

// Every object the tool creates has a uid from a seed and a SHOW_ code, so
// re-runs update in place and the objects are easy to find on a server
const uid = (seed) => deterministicUid(`demo-maps-showcase:${seed}`)

const CODE_PREFIX = 'SHOW_'

// Every map, dashboard and download says the data is invented, in words
// readers outside DHIS2 understand
const DEMO_LABEL = 'DEMO DATA, NOT REAL'
const DEMO_NOTICE =
    'DEMO DATA, NOT REAL. Invented for a DHIS2 Maps demo: no real cases, outbreaks or performance.'
// Added to the names of the tool's data items, so legends, pop-ups and data
// tables say it too
const DEMO_SUFFIX = ' (demo data)'
const demoName = (name) => `${name}${DEMO_SUFFIX}`

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
    DEMO_LABEL,
    DEMO_NOTICE,
    PUBLIC_READ,
    code,
    dataSetSharing,
    demoName,
    uid,
}
