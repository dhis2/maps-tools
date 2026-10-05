/*
 * Group 3: items collected at more than one period type, or with data no
 * data set explains any more. All SUM. Data sits only in periods fully
 * inside a quarter (Q2 2024 or Q2 2025), so every assignment rule puts it
 * in that quarter. A case asks for every period of a query type in the
 * quarter and compares the total with the quarter itself: the coarser
 * probe. Less than the quarter is PARTIAL, nothing is EMPTY.
 *
 * - mw: in a Monday and a Wednesday weekly data set, both used at A and B.
 * - place: monthly at A, weekly at B.
 * - history: monthly in 2024, weekly in 2025, and only the weekly data set
 *   left.
 * - orphan: monthly values, then removed from its only data set.
 */
const { fits } = require('../expected.js')
const {
    periodFromId,
    periodsInside,
    periodsOverlapping,
} = require('../period-types.js')
const { ORG_UNITS, dataElement, dataSet, itemOf } = require('./shared.js')

const KEY = 'mixed-collection'
const QUERY_TYPES = [
    'Daily',
    'Weekly',
    'WeeklyWednesday',
    'BiWeekly',
    'Monthly',
    'Quarterly',
    'Yearly',
]
const TOLERANCE = 1e-9

/*
 * Streams of values: one element, collected at one type, at one place, in
 * one quarter. `final` is false for a membership removed after import.
 */
const SUBJECTS = [
    {
        name: 'mw',
        notes: 'In a Monday and a Wednesday weekly data set, both used at A and B.',
        ranges: ['2025Q2'],
        streams: [
            {
                periodType: 'Weekly',
                places: ['A', 'B'],
                value: 1,
                range: '2025Q2',
            },
            {
                periodType: 'WeeklyWednesday',
                places: ['A', 'B'],
                value: 2,
                range: '2025Q2',
            },
        ],
        dataSets: [
            { periodType: 'Weekly', orgUnits: ['A', 'B'], final: true },
            {
                periodType: 'WeeklyWednesday',
                orgUnits: ['A', 'B'],
                final: true,
            },
        ],
        collectionPeriodTypes: ['Weekly', 'WeeklyWednesday'],
    },
    {
        name: 'place',
        notes: 'Monthly at A, weekly at B.',
        ranges: ['2025Q2'],
        streams: [
            { periodType: 'Monthly', places: ['A'], value: 1, range: '2025Q2' },
            { periodType: 'Weekly', places: ['B'], value: 1, range: '2025Q2' },
        ],
        dataSets: [
            { periodType: 'Monthly', orgUnits: ['A'], final: true },
            { periodType: 'Weekly', orgUnits: ['B'], final: true },
        ],
        collectionPeriodTypes: ['Monthly', 'Weekly'],
    },
    {
        name: 'history',
        notes: 'Monthly in 2024, weekly in 2025; only the weekly data set is left.',
        ranges: ['2024Q2', '2025Q2'],
        streams: [
            {
                periodType: 'Monthly',
                places: ['A', 'B'],
                value: 1,
                range: '2024Q2',
            },
            {
                periodType: 'Weekly',
                places: ['A', 'B'],
                value: 1,
                range: '2025Q2',
            },
        ],
        dataSets: [
            { periodType: 'Monthly', orgUnits: ['A', 'B'], final: false },
            { periodType: 'Weekly', orgUnits: ['A', 'B'], final: true },
        ],
        collectionPeriodTypes: ['Weekly'],
    },
    {
        name: 'orphan',
        notes: 'Monthly values, then removed from its only data set.',
        ranges: ['2025Q2'],
        streams: [
            {
                periodType: 'Monthly',
                places: ['A', 'B'],
                value: 1,
                range: '2025Q2',
            },
        ],
        dataSets: [
            { periodType: 'Monthly', orgUnits: ['A', 'B'], final: false },
        ],
        collectionPeriodTypes: [],
    },
]

const placeFactor = (place) => (place === 'A' ? 1 : 10)
const placesOf = (orgUnit) => (orgUnit === 'region' ? ['A', 'B'] : [orgUnit])

const streamPeriods = (stream) => {
    const range = periodFromId(stream.range)
    return periodsInside(stream.periodType, range.startDate, range.endDate)
}

const streamTotal = (stream, orgUnit) =>
    placesOf(orgUnit)
        .filter((place) => stream.places.includes(place))
        .reduce(
            (sum, place) =>
                sum +
                streamPeriods(stream).length *
                    stream.value *
                    placeFactor(place),
            0
        )

// Under the hypothesis, a stream counts when its type fits the query type.
const expectedFor = (subject, rangeId, queryType, orgUnit) => {
    const streams = subject.streams.filter((s) => s.range === rangeId)
    const total = streams.reduce((sum, s) => sum + streamTotal(s, orgUnit), 0)
    const counted = streams
        .filter((s) => fits(s.periodType, queryType))
        .reduce((sum, s) => sum + streamTotal(s, orgUnit), 0)
    if (!counted) {
        return { status: 'EMPTY', value: null }
    }
    return { status: counted < total ? 'PARTIAL' : 'VALUE', value: counted }
}

// The coarser probe: the query type's periods against the quarter itself.
const observeProbe = (finerCount) => (results) => {
    const error = results.find((result) => result?.error)?.error
    if (error) {
        return { status: 'ERROR', value: null, error }
    }
    const finer = results.slice(0, finerCount).filter((r) => r.value !== null)
    const coarse = results[finerCount].value
    if (!finer.length) {
        return { status: 'EMPTY', value: null, extra: { coarse } }
    }
    const total = finer.reduce((sum, r) => sum + r.value, 0)
    const partial = coarse !== null && total < coarse - TOLERANCE
    return {
        status: partial ? 'PARTIAL' : 'VALUE',
        value: total,
        extra: { coarse, rows: finer.length },
    }
}

const buildGroup = () => {
    const built = SUBJECTS.map((subject) => {
        const element = dataElement(`g3-${subject.name}`, {
            code: `PTT_G3_${subject.name.toUpperCase()}`,
            name: `PTT G3 ${subject.name}`,
            aggregationType: 'SUM',
        })
        const dataSets = subject.dataSets.map((spec) => ({
            spec,
            set: dataSet(`g3-ds-${subject.name}-${spec.periodType}`, {
                code: `PTT_G3_DS_${subject.name.toUpperCase()}_${spec.periodType}`,
                name: `PTT G3 ${subject.name} data set ${spec.periodType}`,
                periodType: spec.periodType,
                elements: [{ id: element.id, temporary: !spec.final }],
                orgUnits: spec.orgUnits,
            }),
        }))
        return { subject, element, dataSets }
    })

    const dataValues = built.flatMap(({ subject, element, dataSets }) =>
        subject.streams.flatMap((stream) => {
            const { set } = dataSets.find(
                ({ spec }) =>
                    spec.periodType === stream.periodType &&
                    stream.places.every((p) => spec.orgUnits.includes(p))
            )
            return streamPeriods(stream).flatMap((period) =>
                stream.places.map((place) => ({
                    dataSet: set.id,
                    dataElement: element.id,
                    period: period.id,
                    orgUnit: place,
                    value: stream.value * placeFactor(place),
                }))
            )
        })
    )

    const cases = built.flatMap(({ subject, element, dataSets }) => {
        /*
         * One source per data set the element is in once the import is
         * done (plan, Addendum 1), so a later place check keeps its shape.
         */
        const item = {
            ...itemOf(element, subject.collectionPeriodTypes, subject.notes),
            collectionSources: dataSets
                .filter(({ spec }) => spec.final)
                .map(({ spec, set }) => ({
                    dataSet: set.name,
                    periodType: spec.periodType,
                    orgUnits: spec.orgUnits,
                })),
        }
        return subject.ranges.flatMap((rangeId) => {
            const range = periodFromId(rangeId)
            return QUERY_TYPES.flatMap((queryType) => {
                const finer = periodsOverlapping(
                    queryType,
                    range.startDate,
                    range.endDate
                )
                return ORG_UNITS.map((orgUnit) => ({
                    id: `mixed-${subject.name}__q-${queryType}__r-${rangeId}__${orgUnit}`,
                    item,
                    query: {
                        periodType: queryType,
                        period: rangeId,
                        orgUnit,
                        coarser: 'Quarterly',
                    },
                    expected: expectedFor(subject, rangeId, queryType, orgUnit),
                    cells: [...finer, range].map((period) => ({
                        dx: element.id,
                        pe: period.id,
                        ou: orgUnit,
                    })),
                    batchKey: `${subject.name}|${rangeId}|${queryType}`,
                    observe: observeProbe(finer.length),
                }))
            })
        })
    })

    return {
        key: KEY,
        number: 3,
        title: 'Mixed collection',
        dataElements: built.map(({ element }) => element),
        dataSets: built.flatMap(({ dataSets }) =>
            dataSets.map(({ set }) => set)
        ),
        dataValues,
        cases,
    }
}

module.exports = { KEY, SUBJECTS, buildGroup, expectedFor, observeProbe }
