// Enumerates the boolean-flag combinations that drive the test matrix.
// Event-level flags apply to every event (standalone or under an enrollment):
// - eventGeometry: event has its own geometry (psigeometry)
// - orgUnitHasGeometry: event's assigned org unit has geometry (ougeometry)
// - deCoordinate: "Maps Test Coordinate DE" has a value
// - deOrgUnit: "Maps Test OrgUnit DE" has a value
const EVENT_FLAG_KEYS = [
    'eventGeometry',
    'orgUnitHasGeometry',
    'deCoordinate',
    'deOrgUnit',
]
const EVENT_CODE_PREFIXES = ['EVT', 'OU', 'DEC', 'DEO']

// Enrollment-level flags apply once per TEI/enrollment pair (tracker program
// only):
// - teiGeometry: tracked entity has geometry (teigeometry)
// - enrollmentGeometry: enrollment has geometry (pigeometry)
// - teaCoordinate: "Maps Test Coordinate TEA" has a value
// - teaOrgUnit: "Maps Test OrgUnit TEA" has a value
const ENROLLMENT_FLAG_KEYS = [
    'teiGeometry',
    'enrollmentGeometry',
    'teaCoordinate',
    'teaOrgUnit',
]
const ENROLLMENT_CODE_PREFIXES = ['TEI', 'PI', 'TEAC', 'TEAO']

// Enumerates every combination of n boolean flags, e.g. n=2 ->
// [{a:false,b:false}, {a:false,b:true}, {a:true,b:false}, {a:true,b:true}]
const enumerateFlags = (keys) => {
    const combos = []
    const total = 2 ** keys.length
    for (let i = 0; i < total; i++) {
        const flags = {}
        keys.forEach((key, bitIndex) => {
            flags[key] = Boolean((i >> bitIndex) & 1)
        })
        combos.push(flags)
    }
    return combos
}

const buildScenarioCode = (flags, keys, prefixes) =>
    keys.map((key, i) => `${prefixes[i]}${flags[key] ? 1 : 0}`).join('_')

const getEventScenarios = () =>
    enumerateFlags(EVENT_FLAG_KEYS).map((flags, index) => ({
        index,
        flags,
        code: buildScenarioCode(flags, EVENT_FLAG_KEYS, EVENT_CODE_PREFIXES),
    }))

const getEnrollmentScenarios = () =>
    enumerateFlags(ENROLLMENT_FLAG_KEYS).map((flags, index) => ({
        index,
        flags,
        code: buildScenarioCode(
            flags,
            ENROLLMENT_FLAG_KEYS,
            ENROLLMENT_CODE_PREFIXES
        ),
    }))

module.exports = {
    getEventScenarios,
    getEnrollmentScenarios,
}
