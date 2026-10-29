const { deterministicUid } = require('./uid.js')

const NAME_PREFIX = 'Data table test: '
const DEFAULT_BASEMAP_ID = 'osmLight'

const uid = (seed) => deterministicUid(`datatable-maps:${seed}`)

// The layer properties maps-app saves (validLayerProperties in maps-app's
// src/util/favorites.js), without the ones the server sets itself
const LAYER_PROPERTIES = [
    'aggregationType',
    'areaRadius',
    'geometryCentroid',
    'band',
    'classes',
    'colorHigh',
    'colorLow',
    'colorScale',
    'columns',
    'config',
    'datasetId',
    'endDate',
    'eventCoordinateField',
    'eventClustering',
    'eventPointColor',
    'eventPointRadius',
    'eventStatus',
    'featureStyle',
    'filter',
    'filters',
    'followUp',
    'labels',
    'labelFontSize',
    'labelFontStyle',
    'labelFontWeight',
    'labelFontColor',
    'labelTemplate',
    'countFeaturesWithoutCoordinates',
    'countEventsOutsideOrgUnits',
    'legendDecimalPlaces',
    'legendIsolated',
    'layer',
    'layerId',
    'legendSet',
    'method',
    'name',
    'noDataColor',
    'noDataLegend',
    'unclassifiedLegend',
    'hidden',
    'opacity',
    'organisationUnitColor',
    'organisationUnitGroupSet',
    'organisationUnitSelectionMode',
    'orgUnitField',
    'orgUnitFieldDisplayName',
    'style',
    'period',
    'periodType',
    'renderingStrategy',
    'program',
    'programStage',
    'programStatus',
    'radiusHigh',
    'radiusLow',
    'rows',
    'serverCluster',
    'startDate',
    'styleDataItem',
    'labelDataItem',
    'thematicMapType',
    'trackedEntityType',
    'valueType',
    'relationshipType',
    'relatedPointColor',
    'relatedPointRadius',
    'relationshipLineColor',
    'relationshipOutsideProgram',
]

const MODELS = ['program', 'programStage', 'organisationUnitGroupSet']
const MODEL_PROPERTIES = [
    'id',
    'name',
    'path',
    'dimensionType',
    'dimensionItemType',
]

// Saved by data table builds that never shipped: the Combined table's hidden
// reference layer and config keys, and the saved column configuration
const DROPPED_LAYERS = new Set(['combinedTableRef'])
const DROPPED_CONFIG_KEYS = [
    'combinedLayerKey',
    'combinedJoinConfig',
    'combinedColumnConfig',
    'dataTableColumnConfig',
]

const pick = (keys, object) =>
    Object.fromEntries(
        keys
            .filter((key) => object[key] !== undefined && object[key] !== null)
            .map((key) => [key, object[key]])
    )

const cleanConfig = (config) => {
    let parsed
    try {
        parsed = JSON.parse(config)
    } catch {
        return config
    }
    DROPPED_CONFIG_KEYS.forEach((key) => delete parsed[key])
    return Object.keys(parsed).length ? JSON.stringify(parsed) : undefined
}

const cleanDimension = (dimension) => ({
    ...dimension,
    items: dimension.items.map((item) => pick(MODEL_PROPERTIES, item)),
})

const cleanLayer = (view) => {
    const layer = pick(LAYER_PROPERTIES, view)
    MODELS.filter((key) => layer[key]).forEach((key) => {
        layer[key] = pick(MODEL_PROPERTIES, layer[key])
    })
    if (layer.rows) {
        layer.rows = layer.rows.map(cleanDimension)
    }
    if (layer.config) {
        const config = cleanConfig(layer.config)
        if (config === undefined) {
            delete layer.config
        } else {
            layer.config = config
        }
    }
    return layer
}

const cleanLayers = (mapViews) =>
    mapViews.filter(({ layer }) => !DROPPED_LAYERS.has(layer)).map(cleanLayer)

// Some maps saved on 2.43 carry the legacy basemap JSON as the basemap id
const parseBasemap = ({ basemaps, basemap }) => {
    const [first] = basemaps ?? []
    const json = first ? first.id : basemap
    if (!json?.startsWith('{')) {
        return first
    }
    try {
        return JSON.parse(json)
    } catch {
        return undefined
    }
}

// Same payload as maps-app's getBasemapPayload: a basemaps list on 2.43 and
// later, the legacy JSON string before; an empty id falls back to OSM Light
const getBasemapPayload = (source, serverMinor) => {
    const basemap = parseBasemap(source)
    const payload = {
        id: basemap?.id || DEFAULT_BASEMAP_ID,
        opacity: basemap?.opacity ?? 1,
        hidden: basemap?.hidden ?? false,
    }
    return serverMinor >= 43
        ? { basemaps: [payload] }
        : { basemap: JSON.stringify(payload) }
}

const buildMap = (source, scenario, { serverMinor }) => ({
    id: uid(`map:${scenario.sourceId}`),
    name: `${NAME_PREFIX}${scenario.name}`,
    description: `${scenario.description} Copy of map ${scenario.sourceId} on maps-app-43-1, made by maps-tools test-data-datatable-maps.`,
    ...pick(['latitude', 'longitude', 'zoom'], source),
    ...getBasemapPayload(source, serverMinor),
    mapViews: cleanLayers(source.mapViews),
})

const buildMaps = (snapshot, scenarios, options) =>
    scenarios.map((scenario) => {
        const source = snapshot.maps.find(({ id }) => id === scenario.sourceId)
        if (!source) {
            throw new Error(`Map ${scenario.sourceId} is not in the snapshot`)
        }
        return buildMap(source, scenario, options)
    })

module.exports = {
    buildMaps,
    cleanLayers,
    DROPPED_CONFIG_KEYS,
    DROPPED_LAYERS,
    LAYER_PROPERTIES,
    NAME_PREFIX,
}
