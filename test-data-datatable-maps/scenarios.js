// One test map per scenario, copied from a map saved by hand on
// maps-app-43-1 while the data table was built (the "#3735 - ..." maps)
const SCENARIOS = [
    {
        sourceId: 'yYaagMvoVTE',
        name: 'Thematic layer - Single',
        description:
            'ANC 1st visit for the last 12 months by district: value, legend, range and colour columns.',
    },
    {
        sourceId: 'aOJt39Bxi7o',
        name: 'Thematic layer - Timeline',
        description:
            'ANC 1st visit as a timeline over the last 12 months: columns follow the period shown, other periods can be added as columns.',
    },
    {
        sourceId: 'McbOy0vTX5C',
        name: 'Thematic layer - Timeline (x2)',
        description:
            'ANC 1st and 2nd visit, both as timelines: two tables, one per layer.',
    },
    {
        sourceId: 'Xcb2gEhq9EX',
        name: 'Thematic layer - Split',
        description:
            'ANC 1st visit split by June, July and August 2025: one value column per period, no legend, range or colour columns.',
    },
    {
        sourceId: 'jFLIzT79k0q',
        name: 'Thematic layer - Split (x2)',
        description:
            'ANC 1st and 2nd visit, both split by June, July and August 2025: two tables, one per layer.',
    },
    {
        sourceId: 'Ty4iI2O3t3c',
        name: 'Facilities layer - No style',
        description: 'Facilities at level 4, not styled by a group set.',
    },
    {
        sourceId: 'tMLCPz8Lb0B',
        name: 'Facilities layer - Facility type',
        description:
            'Facilities styled by the Facility type group set: group, colour and icon columns.',
    },
    {
        sourceId: 'BJ6PDONq0UQ',
        name: 'Organisation units layer - No style',
        description: 'Chiefdom boundaries, not styled by a group set.',
    },
    {
        sourceId: 'C7PIMo0NuNV',
        name: 'Organisation units layer - Area',
        description:
            'District boundaries styled by the Area group set: group and colour columns.',
    },
    {
        sourceId: 'FMgI8NLiFxj',
        name: 'Earth engine layer - Population age groups',
        description:
            'WorldPop Global2 population for two age groups by district, as sum and mean: one column per band and statistic.',
    },
    {
        sourceId: 'ezJk7w1rFuN',
        name: 'Tracked entities layer',
        description:
            'Malaria focus investigations in Sierra Leone: for the tracked entity data table, which is not in the first release.',
    },
    {
        sourceId: 'vzs97laj9ID',
        name: 'Events layer - ~1k - Server cluster',
        description:
            'Child Programme births in one district over the last 5 years, clustered, not styled.',
    },
    {
        sourceId: 'BspYL92n5pW',
        name: 'Events layer - ~1k - Client cluster - MCH Apgar Score',
        description:
            'Child Programme births in one district over the last 5 years, styled by the numeric MCH Apgar Score: legend and range columns.',
    },
    {
        sourceId: 'yKWzn188DgM',
        name: 'Events layer - ~10k - Server cluster',
        description:
            'Child Programme births in Sierra Leone over the last 10 years, clustered, not styled.',
    },
    {
        sourceId: 'd28EZNVL7K4',
        name: 'Events layer - ~10k - Client cluster - Gender',
        description:
            'Child Programme births in 13 districts over the last 10 years, styled by the Gender option set.',
    },
    {
        sourceId: 'YeFx91b5MJb',
        name: 'Events layer - ~50k - Server cluster',
        description:
            'Inpatient morbidity and mortality events in Sierra Leone over the last 10 years, clustered, not styled.',
    },
    {
        sourceId: 'MspwLJoAM07',
        name: 'Events layer - ~50k - Client cluster - Age in years',
        description:
            'Inpatient morbidity and mortality events over the last 10 years, styled by the integer Age in years.',
    },
    {
        sourceId: 'SsyMJjoX4Hi',
        name: 'Events layer - >100k - Server cluster',
        description:
            'Malaria case registrations in Sierra Leone over the last 10 years, clustered, not styled.',
    },
    {
        sourceId: 'JXuEP1lEhSD',
        name: 'Events layer - >100k - Client cluster - Gender',
        description:
            'Malaria case registrations over the last 10 years, styled by the Gender option set.',
    },
    {
        sourceId: 'rormF2g4e2v',
        name: 'Malaria cases (aggregated) and NDVI',
        description:
            'Malaria case count by district and the monthly vegetation index from Earth Engine: a thematic and an Earth Engine table.',
    },
    {
        sourceId: 'Ucnjhj4nka0',
        name: 'MCH Apgar Score (events) and Org Units',
        description:
            'Chiefdoms of one district and births styled by MCH Apgar Score: an organisation unit and an event table.',
    },
]

module.exports = { SCENARIOS }
