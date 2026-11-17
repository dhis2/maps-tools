// WorldPop Global2 total population per chiefdom and district and year,
// from the Earth Engine snapshots, for the posts that divide by it
const fs = require('node:fs')
const path = require('node:path')
const {
    dataElement,
    dataElementId,
    dataSet,
    dataSetId,
} = require('./metadata.js')
const { DEFAULT_COC, DISTRICTS } = require('./sierraLeone.js')

const INPUT_DIR = path.join(__dirname, '..', 'input', 'sierra-leone')
const readInput = (file) =>
    JSON.parse(fs.readFileSync(path.join(INPUT_DIR, file), 'utf8')).values

const POPULATION = 'EMONC_POP_WORLDPOP'
const DATA_SET = 'WORLDPOP_POPULATION_YEARLY'
const DEFAULT_YEAR = '2025'

const populationId = dataElementId(POPULATION)

// { [year]: { [chiefdomId]: people } }
const chiefdomPopulation = () => readInput('worldpop-totals.json')

// { [year]: { [districtId]: people } }
const districtPopulation = () => {
    const values = readInput('emonc-coverage.json')
    return Object.fromEntries(
        Object.entries(values).map(([year, byDistrict]) => [
            year,
            Object.fromEntries(
                Object.entries(byDistrict).map(([district, { total }]) => [
                    district,
                    total,
                ])
            ),
        ])
    )
}

const populationMetadata = ({ importerId }) => ({
    dataElements: [
        dataElement({
            key: POPULATION,
            name: 'Population (WorldPop Global2)',
            aggregationType: 'AVERAGE_SUM_ORG_UNIT',
            real: true,
        }),
    ],
    dataSets: [
        dataSet({
            key: DATA_SET,
            name: 'Population (WorldPop Global2, synthetic demo)',
            periodType: 'Yearly',
            orgUnits: [
                ...Object.values(DISTRICTS),
                ...Object.keys(chiefdomPopulation()[DEFAULT_YEAR]),
            ].map((id) => ({ id })),
            dataElements: [populationId],
            importerId,
        }),
    ],
})

const value = (orgUnit, period, people) => ({
    dataElement: populationId,
    orgUnit,
    period,
    categoryOptionCombo: DEFAULT_COC,
    attributeOptionCombo: DEFAULT_COC,
    ...(people === undefined ? {} : { value: String(people) }),
})

// Stored per chiefdom only, so districts get their sum and rates can be
// mapped by chiefdom; district values of earlier runs are deleted
const populationValueSets = () => [
    {
        dataSet: dataSetId(DATA_SET),
        dataValues: Object.entries(chiefdomPopulation()).flatMap(
            ([year, byChiefdom]) =>
                Object.entries(byChiefdom).map(([orgUnit, people]) =>
                    value(orgUnit, year, people)
                )
        ),
    },
    {
        dataSet: dataSetId(DATA_SET),
        importStrategy: 'DELETE',
        dataValues: Object.keys(chiefdomPopulation()).flatMap((year) =>
            Object.values(DISTRICTS).map((orgUnit) => value(orgUnit, year))
        ),
    },
]

module.exports = {
    chiefdomPopulation,
    districtPopulation,
    populationId,
    populationMetadata,
    populationValueSets,
}
