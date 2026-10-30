// The map view fields maps-app requests when it opens a saved map (mapFields
// in maps-app's src/util/helpers.js), so a snapshot holds what the app loads
const NAME_PROPERTY = 'displayName~rename(name)'
const DIMENSION = `[dimension,filter,items[dimensionItem~rename(id),dimensionItemType,${NAME_PROPERTY}]]`

const MAP_VIEW_FIELDS = [
    '*',
    `columns${DIMENSION}`,
    `rows${DIMENSION}`,
    `filters${DIMENSION}`,
    'organisationUnits[id,path]',
    'dataDimensionItems',
    `program[id,${NAME_PROPERTY}]`,
    `programStage[id,${NAME_PROPERTY}]`,
    `legendSet[id,${NAME_PROPERTY}]`,
    `trackedEntityType[id,${NAME_PROPERTY}]`,
    'organisationUnitSelectionMode',
    '!href',
    '!publicAccess',
    '!rewindRelativePeriods',
    '!userOrganisationUnit',
    '!userOrganisationUnitChildren',
    '!userOrganisationUnitGrandChildren',
    '!externalAccess',
    '!access',
    '!relativePeriods',
    '!columnDimensions',
    '!rowDimensions',
    '!filterDimensions',
    '!user',
    '!organisationUnitGroups',
    '!itemOrganisationUnitGroups',
    '!userGroupAccesses',
    '!indicators',
    '!dataElements',
    '!dataElementOperands',
    '!dataElementGroups',
    '!dataSets',
    '!periods',
    '!organisationUnitLevels',
    '!sortOrder',
    '!topLimit',
]

const MAP_FIELDS = [
    'id',
    'name',
    'description',
    'longitude',
    'latitude',
    'zoom',
    'basemap',
    'basemaps',
    'lastUpdated',
    `mapViews[${MAP_VIEW_FIELDS.join(',')}]`,
].join(',')

module.exports = { MAP_FIELDS }
