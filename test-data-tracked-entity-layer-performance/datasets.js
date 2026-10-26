// One tracked entity type and program per dataset, so each size can be
// added to the map as its own layer. 100k goes above the maps-app limit
// of 50,000 rows, to trigger its truncation warning.
const DATASETS = [
    { key: '1k', count: 1000, featureType: 'POINT' },
    { key: '10k', count: 10000, featureType: 'POINT' },
    { key: '50k', count: 50000, featureType: 'POINT' },
    { key: '100k', count: 100000, featureType: 'POINT' },
    { key: 'poly-10k', count: 10000, featureType: 'POLYGON' },
]

const CODE_PREFIX = 'PTE_'

// "poly-10k" => "PTE_POLY_10K"
const datasetCode = ({ key }) =>
    `${CODE_PREFIX}${key.toUpperCase().replace(/-/g, '_')}`

const selectDatasets = (keys = []) => {
    if (!keys.length) {
        return DATASETS
    }
    const unknown = keys.filter(
        (key) => !DATASETS.some((dataset) => dataset.key === key)
    )
    if (unknown.length) {
        throw new Error(
            `Unknown dataset(s): ${unknown.join(', ')}. Known: ${DATASETS.map(
                (dataset) => dataset.key
            ).join(', ')}`
        )
    }
    return DATASETS.filter((dataset) => keys.includes(dataset.key))
}

module.exports = { CODE_PREFIX, DATASETS, datasetCode, selectDatasets }
