/*
 * Group 16: a data element in two data sets that give it different
 * category combos and period types. Its own combo is A (sex: female,
 * male); the monthly data set keeps A, the quarterly one gives it B (age:
 * under 5, 5 and over). Values in Q2 2025: female 1 and male 2 a month,
 * under 5 100 and 5 and over 200 a quarter, 10 times that at B.
 *
 * - `both`: both data sets at A and B.
 * - `place`: the monthly set at A only, the quarterly set at B only.
 *
 * Each is asked as a whole and as one option combo of each combo, by month
 * and by quarter, at A, B and the region, with group 3's probe: the query
 * type's periods in Q2 2025 against the quarter itself.
 *
 * The category option combos are imported with our own ids, which every
 * version keeps, so the fixtures can name them.
 */
const { periodFromId, periodsInside } = require('../period-types.js')
const { uid } = require('../uid.js')
const { observeProbe } = require('./mixed-collection.js')
const { ORG_UNITS, dataElement, dataSet } = require('./shared.js')

const KEY = 'disaggregation'
const RANGE = '2025Q2'
const QUERY_TYPES = ['Monthly', 'Quarterly']
const PUBLIC_DATA_WRITE = { public: 'rwrw----', users: {}, userGroups: {} }

const named = (key, name, extra = {}) => ({
    key,
    id: uid(`dis-${key}`),
    code: `PTT_DIS_${key.toUpperCase().replace(/-/g, '_')}`,
    name: `PTT ${name}`,
    shortName: `PTT ${name}`.slice(0, 50),
    ...extra,
})

const OPTIONS = [
    named('female', 'female'),
    named('male', 'male'),
    named('under5', 'under 5'),
    named('over5', '5 and over'),
].map((option) => ({ ...option, sharing: PUBLIC_DATA_WRITE }))
const option = (key) => OPTIONS.find((o) => o.key === key)

const CATEGORIES = [
    named('sex', 'sex', { options: ['female', 'male'] }),
    named('age', 'age group', { options: ['under5', 'over5'] }),
]

const COMBOS = {
    A: named('combo-a', 'sex combo', { category: 'sex' }),
    B: named('combo-b', 'age combo', { category: 'age' }),
}

// One option combo per option, keyed like the option.
const OPTION_COMBOS = Object.entries(COMBOS).flatMap(([comboKey, combo]) =>
    CATEGORIES.find((c) => c.key === combo.category).options.map((key) => ({
        key,
        combo: comboKey,
        id: uid(`dis-coc-${key}`),
        code: `PTT_DIS_COC_${key.toUpperCase()}`,
        name: option(key).name.replace('PTT ', ''),
    }))
)
const optionCombo = (key) => OPTION_COMBOS.find((c) => c.key === key)

const MONTHLY_VALUES = { female: 1, male: 2 }
const QUARTERLY_VALUES = { under5: 100, over5: 200 }
const placeFactor = (place) => (place === 'A' ? 1 : 10)
const placesOf = (orgUnit) => (orgUnit === 'region' ? ['A', 'B'] : [orgUnit])

const SUBJECTS = [
    { name: 'both', monthlyAt: ['A', 'B'], quarterlyAt: ['A', 'B'] },
    { name: 'place', monthlyAt: ['A'], quarterlyAt: ['B'] },
]
const VARIANTS = [
    { name: 'whole', options: null },
    { name: 'female', options: ['female'] },
    { name: 'under5', options: ['under5'] },
]

const metadataOf = () => {
    const comboRef = (key) => ({ id: COMBOS[key].id })
    return {
        categoryOptions: OPTIONS.map(({ key, ...rest }) => rest),
        categories: CATEGORIES.map(({ key, options, ...rest }) => ({
            ...rest,
            dataDimensionType: 'DISAGGREGATION',
            categoryOptions: options.map((k) => ({ id: option(k).id })),
        })),
        categoryCombos: Object.values(COMBOS).map(
            ({ key, category, shortName, ...rest }) => ({
                ...rest,
                dataDimensionType: 'DISAGGREGATION',
                categories: [
                    { id: CATEGORIES.find((c) => c.key === category).id },
                ],
            })
        ),
        categoryOptionCombos: OPTION_COMBOS.map(({ key, combo, ...rest }) => ({
            ...rest,
            categoryCombo: comboRef(combo),
            categoryOptions: [{ id: option(key).id }],
        })),
    }
}

/*
 * Streams of values: one data set's values, at its places, by option
 * combo. A stream counts when its period type fits the query type.
 */
const streamsOf = (subject) => [
    {
        periodType: 'Monthly',
        places: subject.monthlyAt,
        values: MONTHLY_VALUES,
    },
    {
        periodType: 'Quarterly',
        places: subject.quarterlyAt,
        values: QUARTERLY_VALUES,
    },
]

const range = periodFromId(RANGE)
const periodsOf = (periodType) =>
    periodsInside(periodType, range.startDate, range.endDate)

const streamTotal = (stream, orgUnit, options) => {
    const places = placesOf(orgUnit).filter((p) => stream.places.includes(p))
    const perPeriod = Object.entries(stream.values)
        .filter(([key]) => !options || options.includes(key))
        .reduce((sum, [, value]) => sum + value, 0)
    return (
        periodsOf(stream.periodType).length *
        perPeriod *
        places.reduce((sum, place) => sum + placeFactor(place), 0)
    )
}

const fits = (periodType, queryType) =>
    periodType === queryType ||
    (periodType === 'Monthly' && queryType === 'Quarterly')

const expectedFor = (subject, options, queryType, orgUnit) => {
    const streams = streamsOf(subject)
    const total = streams.reduce(
        (s, x) => s + streamTotal(x, orgUnit, options),
        0
    )
    const counted = streams
        .filter((stream) => fits(stream.periodType, queryType))
        .reduce((s, x) => s + streamTotal(x, orgUnit, options), 0)
    if (!counted) {
        return { status: 'EMPTY', value: null }
    }
    return { status: counted < total ? 'PARTIAL' : 'VALUE', value: counted }
}

const buildGroup = () => {
    const built = SUBJECTS.map((subject) => {
        const element = {
            ...dataElement(`dis-${subject.name}`, {
                code: `PTT_DIS_${subject.name.toUpperCase()}`,
                name: `PTT disaggregation ${subject.name}`,
                aggregationType: 'SUM',
            }),
            categoryCombo: { id: COMBOS.A.id },
        }
        const sets = {
            Monthly: dataSet(`dis-ds-${subject.name}-monthly`, {
                code: `PTT_DIS_DS_${subject.name.toUpperCase()}_MONTHLY`,
                name: `PTT disaggregation ${subject.name} monthly, sex`,
                periodType: 'Monthly',
                elements: [{ id: element.id, categoryCombo: COMBOS.A.id }],
                orgUnits: subject.monthlyAt,
            }),
            Quarterly: dataSet(`dis-ds-${subject.name}-quarterly`, {
                code: `PTT_DIS_DS_${subject.name.toUpperCase()}_QUARTERLY`,
                name: `PTT disaggregation ${subject.name} quarterly, age`,
                periodType: 'Quarterly',
                elements: [{ id: element.id, categoryCombo: COMBOS.B.id }],
                orgUnits: subject.quarterlyAt,
            }),
        }
        return { subject, element, sets }
    })

    const dataValues = built.flatMap(({ subject, element, sets }) =>
        streamsOf(subject).flatMap((stream) =>
            periodsOf(stream.periodType).flatMap((period) =>
                stream.places.flatMap((place) =>
                    Object.entries(stream.values).map(([key, value]) => ({
                        dataSet: sets[stream.periodType].id,
                        dataElement: element.id,
                        categoryOptionCombo: optionCombo(key).id,
                        period: period.id,
                        orgUnit: place,
                        value: value * placeFactor(place),
                    }))
                )
            )
        )
    )

    const comboOf = (key) => ({ key, id: COMBOS[key].id })
    const cases = built.flatMap(({ subject, element, sets }) => {
        const sources = ['Monthly', 'Quarterly'].map((periodType) => ({
            dataSet: sets[periodType].name,
            periodType,
            orgUnits: sets[periodType].orgUnits,
            categoryCombo: comboOf(periodType === 'Monthly' ? 'A' : 'B'),
        }))
        return VARIANTS.flatMap((variant) => {
            const coc = variant.options && optionCombo(variant.options[0])
            const dx = coc ? `${element.id}.${coc.id}` : element.id
            const item = {
                code: coc
                    ? `${element.code}.${coc.key.toUpperCase()}`
                    : element.code,
                id: dx,
                dimensionItemType: coc
                    ? 'DATA_ELEMENT_OPERAND'
                    : 'DATA_ELEMENT',
                aggregationType: 'SUM',
                valueType: element.valueType,
                collectionPeriodTypes: ['Monthly', 'Quarterly'],
                categoryCombo: comboOf('A'),
                collectionSources: sources,
                ...(coc
                    ? {
                          categoryOptionCombo: {
                              key: coc.key,
                              id: coc.id,
                              categoryCombo: coc.combo,
                          },
                      }
                    : {}),
            }
            return QUERY_TYPES.flatMap((queryType) => {
                const finer = periodsOf(queryType)
                return ORG_UNITS.map((orgUnit) => ({
                    id: `dis-${subject.name}-${variant.name}__q-${queryType}__r-${RANGE}__${orgUnit}`,
                    item,
                    query: {
                        periodType: queryType,
                        period: RANGE,
                        orgUnit,
                        coarser: 'Quarterly',
                    },
                    expected: expectedFor(
                        subject,
                        variant.options,
                        queryType,
                        orgUnit
                    ),
                    cells: [...finer, range].map((period) => ({
                        dx,
                        pe: period.id,
                        ou: orgUnit,
                    })),
                    batchKey: `dis|${dx}|${queryType}|${orgUnit}`,
                    observe: observeProbe(finer.length),
                }))
            })
        })
    })

    return {
        key: KEY,
        number: 16,
        title: 'Disaggregation',
        dataElements: built.map(({ element }) => element),
        dataSets: built.flatMap(({ sets }) => Object.values(sets)),
        extraMetadata: metadataOf(),
        dataValues,
        cases,
    }
}

module.exports = { KEY, OPTION_COMBOS, buildGroup, expectedFor }
