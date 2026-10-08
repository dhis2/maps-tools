// Data value sets and completeness registrations from the scenario model.
// Pure. Values go one data set per request, with `dataSet` in the payload:
// without it, 2.43.1 answers "Data set detection failed".
const CHUNK_SIZE = 10000

const chunk = (array, size) => {
    const chunks = []
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size))
    }
    return chunks
}

const groupBy = (array, keyOf) =>
    array.reduce((groups, item) => {
        const key = keyOf(item)
        if (!groups.has(key)) {
            groups.set(key, [])
        }
        groups.get(key).push(item)
        return groups
    }, new Map())

// [{ dataSet, dataValues }], at most CHUNK_SIZE values each.
const buildDataValueSets = (groups, orgUnits) => {
    const values = groups.flatMap((group) => group.dataValues ?? [])
    return [...groupBy(values, (value) => value.dataSet)].flatMap(
        ([dataSet, setValues]) =>
            chunk(setValues, CHUNK_SIZE).map((part) => ({
                dataSet,
                dataValues: part.map((value) => ({
                    dataElement: value.dataElement,
                    ...(value.categoryOptionCombo
                        ? { categoryOptionCombo: value.categoryOptionCombo }
                        : {}),
                    period: value.period,
                    orgUnit: orgUnits[value.orgUnit].id,
                    value: String(value.value),
                })),
            }))
    )
}

// 2.40.12 answers 409 with no message to 1,097 registrations at once.
const REGISTRATION_CHUNK_SIZE = 500

// [{ dataSet, registrations }], per data set, in chunks.
const buildRegistrationSets = (groups, orgUnits) => {
    const registrations = groups.flatMap((group) => group.registrations ?? [])
    return [...groupBy(registrations, (r) => r.dataSet)].flatMap(
        ([dataSet, setRegistrations]) =>
            chunk(setRegistrations, REGISTRATION_CHUNK_SIZE).map((part) => ({
                dataSet,
                registrations: part.map((registration) => ({
                    dataSet,
                    period: registration.period,
                    organisationUnit: orgUnits[registration.orgUnit].id,
                    completed: true,
                })),
            }))
    )
}

module.exports = { CHUNK_SIZE, buildDataValueSets, buildRegistrationSets }
