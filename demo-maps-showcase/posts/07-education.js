// Post 7 · Every school on the map: pupil-teacher ratios by school and the
// adjusted gender parity index (GPIA) by district, from two school censuses.
const fs = require('node:fs')
const path = require('node:path')
const { loadFacilityPoints } = require('../shared/geometry.js')
const { PUBLIC_READ, code, uid } = require('../shared/ids.js')
const { legendSet } = require('../shared/legendSets.js')
const { dashboard, map, thematicLayer } = require('../shared/maps.js')
const {
    dataElement,
    dataElementId,
    dataSet,
    dataSetId,
    indicator,
    indicatorId,
} = require('../shared/metadata.js')
const { SCHOOL_CODE_PREFIX } = require('../shared/orgUnits.js')
const { DEFAULT_COC, DISTRICTS } = require('../shared/sierraLeone.js')
const { randomFor } = require('../random.js')

const SCHOOL_AGE_FILE = path.join(
    __dirname,
    '..',
    'input',
    'sierra-leone',
    'worldpop-school-age.json'
)

const EDUCATION_DISTRICTS = ['bo', 'kenema', 'kailahun']
// One junior secondary school for every third primary school
const SECONDARY_EVERY = 3
// National norm: pupils per teacher
const PTR_NORM = 40
const GIRLS_SHARE = 0.49
// Share of children aged 5 to 14 of primary (6-11) and JSS (12-14) age
const PRIMARY_AGE_SHARE = 0.6
const SECONDARY_AGE_SHARE = 0.3
const GROSS_ENROLMENT = { primary: 1.05, secondary: 0.6 }

// Girls' gross enrolment over boys', by level and district: parity in
// primary, girls behind in Kailahun's and boys behind in Bo's JSS
const GIRLS_TO_BOYS = {
    primary: { bo: 1.01, kenema: 0.99, kailahun: 0.98 },
    secondary: { bo: 1.12, kenema: 1.0, kailahun: 0.84 },
}
// A school far above the norm while its neighbours are fine: a teacher
// redeployment, not a recruitment
const OVERCROWDED_DISTRICT = 'bo'

const LEVELS = ['primary', 'secondary']
const DE = {
    enrolment: (level, sex) => `EDU_ENROL_${level.toUpperCase()}_${sex}`,
    population: (level, sex) => `EDU_POP_${level.toUpperCase()}_${sex}`,
    teachers: 'EDU_TEACHERS',
    classrooms: 'EDU_CLASSROOMS',
    latrines: 'EDU_LATRINES',
}
const IND = {
    ptr: 'EDU_PUPIL_TEACHER_RATIO',
    gpia: (level) => `EDU_GPIA_${level.toUpperCase()}`,
}
const CENSUS_DATA_SET = 'EDU_SCHOOL_CENSUS'
const POPULATION_DATA_SET = 'EDU_SCHOOL_AGE_POPULATION'
const GROUPS = {
    schools: uid('orgUnitGroup:SCHOOLS'),
    primary: uid('orgUnitGroup:SCHOOLS_PRIMARY'),
    secondary: uid('orgUnitGroup:SCHOOLS_SECONDARY'),
}
const GROUP_SET = uid('orgUnitGroupSet:SCHOOL_LEVEL')
const LEVEL_NAMES = {
    primary: 'Primary School',
    secondary: 'Junior Secondary School',
}

const near = (random, [lon, lat], km) => {
    const angle = random.between(0, 2 * Math.PI)
    const distance = km * Math.sqrt(random.next())
    return [
        Number((lon + (distance * Math.cos(angle)) / 109).toFixed(6)),
        Number((lat + (distance * Math.sin(angle)) / 110.6).toFixed(6)),
    ]
}

// The town of a facility, from its name ("Ngelehun CHC" gives "Ngelehun")
const townOf = (name) =>
    name
        .replace(
            /\b(CHC|CHP|MCHP|Clinic|Hospital|Health Centre|Health Post)\b.*$/i,
            ''
        )
        .trim()

// A primary school near every facility with a point in the education
// districts, and a junior secondary school near every third one
const planSchools = (facilities, points) => {
    const schools = []
    const names = new Set()
    EDUCATION_DISTRICTS.forEach((key) => {
        facilities
            .filter((f) => f.districtId === DISTRICTS[key] && points[f.id])
            .forEach((facility, i) => {
                const levels = i % SECONDARY_EVERY === 0 ? LEVELS : [LEVELS[0]]
                levels.forEach((level) => {
                    const r = randomFor('post7-school', facility.id, level)
                    let name = `${townOf(facility.name)} ${LEVEL_NAMES[level]}`
                    for (let n = 2; names.has(name); n++) {
                        name = `${townOf(facility.name)} ${
                            LEVEL_NAMES[level]
                        } ${n}`
                    }
                    names.add(name)
                    schools.push({
                        id: uid(`school:${facility.id}:${level}`),
                        code: `${SCHOOL_CODE_PREFIX}${
                            facility.id
                        }_${level.toUpperCase()}`,
                        name,
                        level,
                        districtKey: key,
                        districtId: facility.districtId,
                        chiefdomId: facility.chiefdomId,
                        point: near(r, points[facility.id], 1.5),
                    })
                })
            })
    })
    return schools
}

// WorldPop children aged 5 to 14 per district and year
const schoolAgePopulation = (chiefdoms) => {
    const { values } = JSON.parse(fs.readFileSync(SCHOOL_AGE_FILE, 'utf8'))
    const districtOf = Object.fromEntries(
        chiefdoms.map(({ id, districtId }) => [id, districtId])
    )
    return Object.fromEntries(
        Object.entries(values).map(([year, byChiefdom]) => {
            const totals = {}
            Object.entries(byChiefdom).forEach(([chiefdom, people]) => {
                const district = districtOf[chiefdom]
                totals[district] = (totals[district] || 0) + people
            })
            return [year, totals]
        })
    )
}

const censusYears = (runDate) => [
    runDate.getUTCFullYear() - 2,
    runDate.getUTCFullYear() - 1,
]

const generate = ({ runDate }, { schools, chiefdoms }) => {
    const population = schoolAgePopulation(chiefdoms)
    const years = censusYears(runDate)
    const overcrowded = schools.find(
        (s) => s.districtKey === OVERCROWDED_DISTRICT && s.level === 'primary'
    )
    const census = []
    const populationRows = []
    years.forEach((year) => {
        EDUCATION_DISTRICTS.forEach((key) => {
            const districtId = DISTRICTS[key]
            const children = population[year][districtId]
            LEVELS.forEach((level) => {
                const share =
                    level === 'primary'
                        ? PRIMARY_AGE_SHARE
                        : SECONDARY_AGE_SHARE
                const girlsPop = Math.round(children * share * GIRLS_SHARE)
                const boysPop = Math.round(children * share * (1 - GIRLS_SHARE))
                populationRows.push(
                    {
                        orgUnit: districtId,
                        year,
                        key: DE.population(level, 'GIRLS'),
                        value: girlsPop,
                    },
                    {
                        orgUnit: districtId,
                        year,
                        key: DE.population(level, 'BOYS'),
                        value: boysPop,
                    }
                )
                const boysEnrolled = boysPop * GROSS_ENROLMENT[level]
                const girlsEnrolled =
                    girlsPop *
                    GROSS_ENROLMENT[level] *
                    GIRLS_TO_BOYS[level][key]
                const atLevel = schools.filter(
                    (s) => s.districtKey === key && s.level === level
                )
                const weights = atLevel.map((s) =>
                    randomFor('post7-size', s.id).between(0.5, 1.5)
                )
                const total = weights.reduce((a, b) => a + b, 0)
                atLevel.forEach((school, i) => {
                    const r = randomFor('post7', school.id, year)
                    const boys = Math.round(
                        (boysEnrolled * weights[i] * r.between(0.95, 1.05)) /
                            total
                    )
                    const girls = Math.round(
                        (girlsEnrolled * weights[i] * r.between(0.95, 1.05)) /
                            total
                    )
                    const ptr =
                        school === overcrowded
                            ? r.between(80, 90)
                            : r.between(30, 48)
                    census.push({
                        orgUnit: school.id,
                        year,
                        level,
                        boys,
                        girls,
                        teachers: Math.max(1, Math.round((boys + girls) / ptr)),
                        classrooms: Math.max(
                            1,
                            Math.round((boys + girls) / 45)
                        ),
                        latrines: Math.max(1, Math.round((boys + girls) / 60)),
                    })
                })
            })
        })
    })
    return { years, census, populationRows, overcrowded }
}

// Adjusted gender parity index: symmetrical around 1 (UIS and GEM Report)
const gpiaExpression = (level) => {
    const ratio = (sex) =>
        `(#{${dataElementId(DE.enrolment(level, sex))}}/#{${dataElementId(
            DE.population(level, sex)
        )}})`
    const g = ratio('GIRLS')
    const b = ratio('BOYS')
    return `if(${g} > ${b}, 2 - ${b}/${g}, ${g}/${b})`
}

const legendSets = {
    ptr: legendSet({
        key: 'PUPIL_TEACHER_RATIO',
        name: `Showcase: pupil-teacher ratio (norm ${PTR_NORM})`,
        // ColorBrewer Oranges; bubbles are sized over this range, so it ends
        // near the most crowded school
        legends: [
            {
                name: `${PTR_NORM} or fewer`,
                start: 0,
                end: PTR_NORM + 0.01,
                color: '#fdd0a2',
            },
            {
                name: `Up to ${PTR_NORM * 1.5}`,
                start: PTR_NORM + 0.01,
                end: PTR_NORM * 1.5,
                color: '#fd8d3c',
            },
            {
                name: `Above ${PTR_NORM * 1.5}`,
                start: PTR_NORM * 1.5,
                end: 100,
                color: '#a63603',
            },
        ],
    }),
    gpia: legendSet({
        key: 'GPIA',
        name: 'Showcase: adjusted gender parity index (UNESCO 0.97-1.03)',
        // ColorBrewer PiYG, diverging around parity
        legends: [
            {
                name: 'Below 0.97 (girls behind)',
                start: 0,
                end: 0.97,
                color: '#de77ae',
            },
            {
                name: '0.97 to 1.03 (parity)',
                start: 0.97,
                end: 1.03,
                color: '#f7f7f7',
            },
            {
                name: 'Above 1.03 (boys behind)',
                start: 1.03,
                end: 2,
                color: '#7fbc41',
            },
        ],
    }),
}

const educationDistricts = EDUCATION_DISTRICTS.map((key) => DISTRICTS[key])

const schoolMap = (level, years) =>
    map({
        key: `post07_${level}`,
        post: 7,
        title: `Every school on the map: ${
            level === 'primary' ? 'primary' : 'junior secondary'
        }, ${years.at(-1)} census`,
        description: `Adjusted gender parity index of gross enrolment by district and pupil-teacher ratio by school, ${
            level === 'primary' ? 'primary' : 'junior secondary'
        } level.`,
        layers: [
            thematicLayer({
                name: 'Adjusted gender parity index',
                dataItem: {
                    id: indicatorId(IND.gpia(level)),
                    dimensionItemType: 'INDICATOR',
                },
                periods: [String(years.at(-1))],
                orgUnits: educationDistricts,
                legendSet: legendSets.gpia.id,
                opacity: 0.8,
                labels: '{name}\n{value}',
                labelColor: '#000000',
            }),
            thematicLayer({
                // The legend names the schools shown, as each map shows one level
                name: `Pupil-teacher ratio, ${
                    level === 'primary' ? 'primary' : 'junior secondary'
                } schools`,
                dataItem: {
                    id: indicatorId(IND.ptr),
                    dimensionItemType: 'INDICATOR',
                },
                periods: [String(years.at(-1))],
                orgUnits: [...educationDistricts, `OU_GROUP-${GROUPS[level]}`],
                legendSet: legendSets.ptr.id,
                radiusLow: 6,
                opacity: 1,
            }),
        ],
    })

const post = {
    number: 7,
    title: 'Every school on the map',

    orgUnitProfile: {
        groupSets: [GROUP_SET],
        dataItems: [
            ...LEVELS.flatMap((level) =>
                ['GIRLS', 'BOYS'].map((sex) =>
                    dataElementId(DE.enrolment(level, sex))
                )
            ),
            dataElementId(DE.teachers),
            dataElementId(DE.classrooms),
            dataElementId(DE.latrines),
            indicatorId(IND.ptr),
        ],
    },

    prepare: async ({ client, orgUnits }) => ({
        schools: planSchools(
            orgUnits.facilities,
            await loadFacilityPoints(client)
        ),
        chiefdoms: orgUnits.chiefdoms,
        districtName: (id) => orgUnits.districts.find((d) => d.id === id)?.name,
    }),

    metadata: ({ importerId }, { schools }) => {
        const members = (level) =>
            schools
                .filter((s) => !level || s.level === level)
                .map(({ id }) => ({ id }))
        const enrolmentKeys = LEVELS.flatMap((level) =>
            ['GIRLS', 'BOYS'].map((sex) => DE.enrolment(level, sex))
        )
        const populationKeys = LEVELS.flatMap((level) =>
            ['GIRLS', 'BOYS'].map((sex) => DE.population(level, sex))
        )
        const levelName = { primary: 'Primary', secondary: 'JSS' }
        const sexName = { GIRLS: 'girls', BOYS: 'boys' }
        return {
            organisationUnits: schools.map((s) => ({
                id: s.id,
                code: s.code,
                name: s.name,
                shortName: s.name.slice(0, 50),
                openingDate: '2000-01-01',
                parent: { id: s.chiefdomId },
                geometry: { type: 'Point', coordinates: s.point },
            })),
            organisationUnitGroups: [
                {
                    id: GROUPS.schools,
                    code: code('OU_GROUP_SCHOOLS'),
                    name: 'Schools',
                    shortName: 'Schools',
                    organisationUnits: members(),
                    sharing: PUBLIC_READ,
                },
                ...LEVELS.map((level) => ({
                    id: GROUPS[level],
                    code: code(`OU_GROUP_SCHOOLS_${level.toUpperCase()}`),
                    name: LEVEL_NAMES[level],
                    shortName: LEVEL_NAMES[level],
                    color: level === 'primary' ? '#2171b5' : '#6a51a3',
                    symbol: '20.png',
                    organisationUnits: members(level),
                    sharing: PUBLIC_READ,
                })),
            ],
            organisationUnitGroupSets: [
                {
                    id: GROUP_SET,
                    code: code('OU_GROUP_SET_SCHOOL_LEVEL'),
                    name: 'School level',
                    shortName: 'School level',
                    compulsory: false,
                    dataDimension: true,
                    organisationUnitGroups: LEVELS.map((level) => ({
                        id: GROUPS[level],
                    })),
                    sharing: PUBLIC_READ,
                },
            ],
            legendSets: Object.values(legendSets),
            dataElements: [
                ...LEVELS.flatMap((level) =>
                    ['GIRLS', 'BOYS'].flatMap((sex) => [
                        dataElement({
                            key: DE.enrolment(level, sex),
                            name: `${levelName[level]} enrolment, ${sexName[sex]}`,
                        }),
                        dataElement({
                            key: DE.population(level, sex),
                            name: `${levelName[level]} school-age population, ${sexName[sex]}`,
                            aggregationType: 'AVERAGE_SUM_ORG_UNIT',
                        }),
                    ])
                ),
                dataElement({ key: DE.teachers, name: 'Teachers' }),
                dataElement({ key: DE.classrooms, name: 'Classrooms' }),
                dataElement({ key: DE.latrines, name: 'Latrines' }),
            ],
            dataSets: [
                dataSet({
                    key: CENSUS_DATA_SET,
                    name: 'Annual school census',
                    periodType: 'Yearly',
                    orgUnits: schools,
                    dataElements: [
                        ...enrolmentKeys,
                        DE.teachers,
                        DE.classrooms,
                        DE.latrines,
                    ].map(dataElementId),
                    importerId,
                }),
                dataSet({
                    key: POPULATION_DATA_SET,
                    name: 'School-age population',
                    periodType: 'Yearly',
                    orgUnits: educationDistricts.map((id) => ({ id })),
                    dataElements: populationKeys.map(dataElementId),
                    importerId,
                }),
            ],
            indicators: [
                indicator({
                    key: IND.ptr,
                    name: 'Pupil-teacher ratio',
                    type: 'number',
                    numerator: enrolmentKeys
                        .map((key) => `#{${dataElementId(key)}}`)
                        .join('+'),
                    denominator: `#{${dataElementId(DE.teachers)}}`,
                    description: 'Pupils enrolled per teacher.',
                    decimals: 0,
                }),
                ...LEVELS.map((level) =>
                    indicator({
                        key: IND.gpia(level),
                        name: `Adjusted gender parity index, ${levelName[level]} gross enrolment`,
                        type: 'number',
                        numerator: gpiaExpression(level),
                        denominator: '1',
                        description:
                            "Girls' gross enrolment ratio over boys', adjusted to be symmetrical around 1: 2 minus boys' over girls' when girls' is higher.",
                        decimals: 2,
                    })
                ),
            ],
        }
    },

    data: (ctx, state) => {
        const { census, populationRows } = generate(ctx, state)
        const value = (key, orgUnit, year, v) => ({
            dataElement: dataElementId(key),
            orgUnit,
            period: String(year),
            categoryOptionCombo: DEFAULT_COC,
            attributeOptionCombo: DEFAULT_COC,
            value: String(v),
        })
        return {
            dataValueSets: [
                {
                    dataSet: dataSetId(CENSUS_DATA_SET),
                    dataValues: census.flatMap((c) => [
                        value(
                            DE.enrolment(c.level, 'BOYS'),
                            c.orgUnit,
                            c.year,
                            c.boys
                        ),
                        value(
                            DE.enrolment(c.level, 'GIRLS'),
                            c.orgUnit,
                            c.year,
                            c.girls
                        ),
                        value(DE.teachers, c.orgUnit, c.year, c.teachers),
                        value(DE.classrooms, c.orgUnit, c.year, c.classrooms),
                        value(DE.latrines, c.orgUnit, c.year, c.latrines),
                    ]),
                },
                {
                    dataSet: dataSetId(POPULATION_DATA_SET),
                    dataValues: populationRows.map((p) =>
                        value(p.key, p.orgUnit, p.year, p.value)
                    ),
                },
            ],
        }
    },

    content: (ctx, state) => {
        const { years, overcrowded } = generate(ctx, state)
        const maps = [
            schoolMap('primary', years),
            schoolMap('secondary', years),
            map({
                key: 'post07_censuses',
                post: 7,
                title: `Pupil-teacher ratio, ${years.join(' and ')} censuses`,
                description:
                    'Pupil-teacher ratio by school, one panel per census year.',
                layers: [
                    thematicLayer({
                        name: 'Pupil-teacher ratio',
                        dataItem: {
                            id: indicatorId(IND.ptr),
                            dimensionItemType: 'INDICATOR',
                        },
                        periods: years.map(String),
                        orgUnits: [
                            ...educationDistricts,
                            `OU_GROUP-${GROUPS.schools}`,
                        ],
                        legendSet: legendSets.ptr.id,
                        renderingStrategy: 'SPLIT_BY_PERIOD',
                        bubble: true,
                        radiusLow: 4,
                        radiusHigh: 12,
                    }),
                ],
            }),
        ]
        const name = state.districtName
        return {
            maps: maps.map((m) => ({ map: m, teams: ['education'] })),
            dashboards: [
                dashboard({ key: 'post07', post: 7, title: 'Education', maps }),
            ],
            interpretations: [
                {
                    map: maps[0].id,
                    author: 'education_director',
                    text: `${
                        overcrowded.name
                    } has more than 80 pupils per teacher, while the schools around it are within the norm of ${PTR_NORM}: two teachers can move there before the next term, no new posts needed. In junior secondary, girls are behind in ${name(
                        DISTRICTS.kailahun
                    )} and boys in ${name(
                        DISTRICTS.bo
                    )}, while primary is at parity everywhere.`,
                    comments: [],
                },
            ],
        }
    },

    checks: (ctx, state) => {
        const { years, overcrowded } = generate(ctx, state)
        const year = years.at(-1)
        return [
            {
                name: 'Parity in primary; girls behind in Kailahun and boys in Bo in JSS',
                path: `/api/analytics?dimension=dx:${indicatorId(
                    IND.gpia('primary')
                )};${indicatorId(
                    IND.gpia('secondary')
                )}&dimension=ou:${educationDistricts.join(
                    ';'
                )}&filter=pe:${year}&skipMeta=true`,
                evaluate: (rows) => {
                    const v = {}
                    rows.forEach(([dx, ou, value]) => {
                        v[`${dx}:${ou}`] = Number(value)
                    })
                    const at = (level, key) =>
                        v[`${indicatorId(IND.gpia(level))}:${DISTRICTS[key]}`]
                    const primaryParity = EDUCATION_DISTRICTS.every(
                        (key) =>
                            at('primary', key) >= 0.97 &&
                            at('primary', key) <= 1.03
                    )
                    return {
                        ok:
                            primaryParity &&
                            at('secondary', 'kailahun') < 0.97 &&
                            at('secondary', 'bo') > 1.03,
                        detail: EDUCATION_DISTRICTS.map(
                            (key) =>
                                `${key} ${at('primary', key)} / ${at(
                                    'secondary',
                                    key
                                )}`
                        ).join(', '),
                    }
                },
            },
            {
                name: 'One overcrowded school among schools within the norm',
                path: `/api/analytics?dimension=dx:${indicatorId(
                    IND.ptr
                )}&dimension=ou:${DISTRICTS[OVERCROWDED_DISTRICT]};OU_GROUP-${
                    GROUPS.primary
                }&filter=pe:${year}&skipMeta=true`,
                evaluate: (rows) => {
                    const above = rows.filter(
                        ([, , value]) => Number(value) > PTR_NORM * 1.5
                    )
                    return {
                        ok:
                            above.length === 1 &&
                            above[0][1] === overcrowded.id,
                        detail: `${above.length} of ${
                            rows.length
                        } primary schools above ${PTR_NORM * 1.5}`,
                    }
                },
            },
        ]
    },
}

module.exports = { ...post, generate, planSchools }
