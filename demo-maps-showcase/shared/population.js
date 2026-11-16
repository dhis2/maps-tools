// WorldPop Global2 total population per district and year, from the Earth
// Engine snapshot, for the posts that divide by it
const fs = require('node:fs')
const path = require('node:path')
const {
    dataElement,
    dataElementId,
    dataSet,
    dataSetId,
} = require('./metadata.js')
const { DEFAULT_COC, DISTRICTS } = require('./sierraLeone.js')

const POPULATION_FILE = path.join(
    __dirname,
    '..',
    'input',
    'sierra-leone',
    'emonc-coverage.json'
)
const POPULATION = 'EMONC_POP_WORLDPOP'
const DATA_SET = 'WORLDPOP_POPULATION_YEARLY'

const populationId = dataElementId(POPULATION)

// { [year]: { [districtId]: people } }
const districtPopulation = () => {
    const { values } = JSON.parse(fs.readFileSync(POPULATION_FILE, 'utf8'))
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
        }),
    ],
    dataSets: [
        dataSet({
            key: DATA_SET,
            name: 'Population (WorldPop Global2, synthetic demo)',
            periodType: 'Yearly',
            orgUnits: Object.values(DISTRICTS).map((id) => ({ id })),
            dataElements: [populationId],
            importerId,
        }),
    ],
})

const populationValueSet = () => ({
    dataSet: dataSetId(DATA_SET),
    dataValues: Object.entries(districtPopulation()).flatMap(
        ([year, byDistrict]) =>
            Object.entries(byDistrict).map(([orgUnit, people]) => ({
                dataElement: populationId,
                orgUnit,
                period: year,
                categoryOptionCombo: DEFAULT_COC,
                attributeOptionCombo: DEFAULT_COC,
                value: String(people),
            }))
    ),
})

module.exports = {
    districtPopulation,
    populationId,
    populationMetadata,
    populationValueSet,
}
