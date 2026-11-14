// The Sierra Leone demo database. Some instances add districts outside the
// real country (play 2.43 has "Nepal (Practice)"), so the posts list theirs.
const ROOT = 'ImspTQPwCqd'

const DISTRICTS = {
    bo: 'O6uvpzGd5pu',
    bombali: 'fdc6uOvgoji',
    bonthe: 'lc3eMKXaEfw',
    kailahun: 'jUb8gELQApl',
    kambia: 'PMa2VCrupOd',
    kenema: 'kJq2mPyFEHo',
    koinadugu: 'qhqAxPSTUXp',
    kono: 'Vth0fbpFcsO',
    moyamba: 'jmIPBj66vD6',
    portLoko: 'TEQlaapDQoK',
    pujehun: 'bL4ooGhyHRQ',
    tonkolili: 'eIQbndfxQMb',
    westernArea: 'at6UHUQatSo',
}

const DISTRICT_IDS = new Set(Object.values(DISTRICTS))

const DEFAULT_COC = 'HllvX50cXC0'

const POPULATION_UNDER_1 = 'DTVRnCGamkV'

module.exports = {
    DEFAULT_COC,
    DISTRICTS,
    DISTRICT_IDS,
    POPULATION_UNDER_1,
    ROOT,
}
