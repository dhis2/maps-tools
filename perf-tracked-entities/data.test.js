const assert = require('node:assert/strict')
const { test } = require('node:test')
const { buildCases, buildReport, median } = require('./benchmark.js')
const { getConfig } = require('./config.js')
const { DATASETS, datasetCode, selectDatasets } = require('./datasets.js')
const { isWritable } = require('./guard.js')
const { metadataErrors, trackerStats } = require('./import-report.js')
const { buildMetadata, datasetIds } = require('./metadata.js')
const { METADATA_TYPES } = require('./cleanup.js')
const { DEMO, MAPS, buildMaps } = require('./maps.js')
const {
    DEMO_PAIRS,
    DEMO_RELATIONSHIP_TYPE,
    SAME_TYPE_COUNT,
    OUTSIDE_PROGRAM_COUNT,
    buildOutsideProgramTrackedEntities,
    buildRelationshipMetadata,
    buildRelationships,
    relationshipTypeId,
} = require('./relationships.js')
const { buildBatch } = require('./tracked-entities.js')
const { uid } = require('./uid.js')

const UID_REGEX = /^[A-Za-z][A-Za-z0-9]{10}$/
const facilities = [
    { id: 'facility001', coordinates: [-11.8, 8.3] },
    { id: 'facility002', coordinates: [-12.1, 7.9] },
]
const pointSet = DATASETS.find(({ key }) => key === '1k')
const polygonSet = DATASETS.find(({ featureType }) => featureType === 'POLYGON')

test('uid is valid and deterministic', () => {
    assert.match(uid('a'), UID_REGEX)
    assert.equal(uid('a'), uid('a'))
    assert.notEqual(uid('a'), uid('b'))
})

test('dataset codes and selection', () => {
    assert.equal(datasetCode({ key: 'poly-10k' }), 'PTE_POLY_10K')
    assert.deepEqual(
        selectDatasets(['1k', '100k']).map(({ key }) => key),
        ['1k', '100k']
    )
    assert.equal(selectDatasets().length, DATASETS.length)
    assert.throws(() => selectDatasets(['2k']), /Unknown dataset/)
})

test('metadata references only objects it defines, all coded PTE_', () => {
    const metadata = buildMetadata(DATASETS, ['facility001'])
    const ids = new Set(
        Object.values(metadata).flatMap((objects) =>
            objects.map(({ id }) => id)
        )
    )
    Object.values(metadata)
        .flat()
        .forEach((object) => {
            assert.match(object.id, UID_REGEX)
            assert.ok(object.code.startsWith('PTE_'), object.code)
        })
    metadata.programs.forEach((program) => {
        assert.ok(ids.has(program.trackedEntityType.id))
        program.programStages.forEach(({ id }) => assert.ok(ids.has(id)))
        program.programTrackedEntityAttributes.forEach(
            ({ trackedEntityAttribute }) =>
                assert.ok(ids.has(trackedEntityAttribute.id))
        )
    })
    assert.deepEqual(
        metadata.trackedEntityTypes.map(({ featureType }) => featureType),
        DATASETS.map(({ featureType }) => featureType)
    )
})

test('batches are deterministic and cover the requested range', () => {
    const batch = buildBatch(pointSet, facilities, 990, 1100)
    assert.equal(batch.trackedEntities.length, 10)
    assert.deepEqual(
        buildBatch(pointSet, facilities, 0, 5),
        buildBatch(pointSet, facilities, 0, 5)
    )
    const ids = buildBatch(pointSet, facilities, 0, 1000).trackedEntities.map(
        ({ trackedEntity }) => trackedEntity
    )
    assert.equal(new Set(ids).size, 1000)
})

test('tracked entities are near their facility, enrolled in the dataset program', () => {
    const [first, second] = buildBatch(
        pointSet,
        facilities,
        0,
        2
    ).trackedEntities
    assert.equal(first.orgUnit, 'facility001')
    assert.equal(second.orgUnit, 'facility002')
    assert.equal(first.geometry.type, 'Point')
    const [lng, lat] = first.geometry.coordinates
    assert.ok(Math.abs(lng + 11.8) <= 0.01 && Math.abs(lat - 8.3) <= 0.01)
    assert.equal(
        first.trackedEntityType,
        datasetIds(pointSet).trackedEntityType
    )
    assert.equal(first.enrollments[0].program, datasetIds(pointSet).program)
    // An event, so tracker analytics creates the type's event table
    assert.equal(
        first.enrollments[0].events[0].programStage,
        datasetIds(pointSet).programStage
    )
    assert.equal(first.attributes.length, 3)
    assert.match(first.attributes[2].value, /^\[-?\d+(\.\d+)?,-?\d+(\.\d+)?\]$/)
})

test('polygon datasets get closed hexagons', () => {
    const [entity] = buildBatch(polygonSet, facilities, 0, 1).trackedEntities
    assert.equal(entity.geometry.type, 'Polygon')
    const [ring] = entity.geometry.coordinates
    assert.equal(ring.length, 7)
    assert.deepEqual(ring[0], ring[6])
})

test('guard only allows test servers', () => {
    assert.ok(isWritable('https://dev.im.dhis2.org/maps-app-43-1'))
    assert.ok(isWritable('https://play.im.dhis2.org/stable-2-43-1'))
    assert.ok(isWritable('http://localhost:8080'))
    assert.ok(!isWritable('https://e2e.im.dhis2.org/analytics-43'))
    assert.ok(!isWritable('https://dev.im.dhis2.org/analytics-dev'))
})

test('config reads flags', () => {
    const config = getConfig([
        '--baseUrl=http://localhost:8080/',
        '--datasets=1k,10k',
        '--batchSize=500',
    ])
    assert.equal(config.baseUrl, 'http://localhost:8080')
    assert.equal(config.instance, 'localhost-8080')
    assert.deepEqual(config.datasets, ['1k', '10k'])
    assert.equal(config.batchSize, 500)
})

test('import report helpers read nested and flat reports', () => {
    assert.deepEqual(
        metadataErrors({
            response: {
                typeReports: [
                    {
                        klass: 'org.hisp.dhis.program.Program',
                        objectReports: [{ errorReports: [{ message: 'Bad' }] }],
                    },
                ],
            },
        }),
        ['Program: Bad']
    )
    const stats = trackerStats({
        status: 'OK',
        stats: { created: 2, ignored: 1 },
        validationReport: { errorReports: [{ message: 'E1000' }] },
    })
    assert.equal(stats.created, 2)
    assert.equal(stats.ignored, 1)
    assert.deepEqual(stats.errors, ['E1000'])
})

test('benchmark cases mirror the maps-app requests', () => {
    const [tracker, analytics] = buildCases(pointSet, 'rootOrgUnit', '2.43.1')
    const { trackedEntityType, program } = datasetIds(pointSet)
    assert.ok(tracker.path.startsWith('/api/tracker/trackedEntities?'))
    assert.ok(tracker.path.includes(`program=${program}`))
    assert.ok(tracker.path.includes('paging=false'))
    assert.ok(
        analytics.path.startsWith(
            `/api/analytics/trackedEntities/query/${trackedEntityType}.json?`
        )
    )
    assert.ok(analytics.path.includes('geometryOnly=true'))
    assert.ok(analytics.path.includes('headers=trackedentity,geometry'))
    assert.ok(
        buildCases(pointSet, 'rootOrgUnit', '2.41.11')[1].path.includes(
            'headers=trackedentityinstanceuid,geometry'
        )
    )
    assert.ok(analytics.path.includes('pageSize=50000'))
    assert.equal(tracker.countRows({ trackedEntities: [1, 2] }), 2)
    assert.equal(analytics.countRows({ rows: [1] }), 1)
})

test('median and report', () => {
    assert.equal(median([3, 1, 2]), 2)
    assert.equal(median([4, 1, 2, 3]), 2.5)
    assert.equal(median([]), null)
    const report = buildReport({
        baseUrl: 'http://localhost:8080',
        version: '2.43.1',
        date: '2026-10-05',
        repeats: 3,
        results: [
            {
                dataset: '1k',
                cases: [
                    {
                        label: 'Analytics (new loader)',
                        rows: 1000,
                        bytes: 1048576,
                        medianMs: 1500,
                        error: null,
                    },
                ],
            },
        ],
    })
    assert.match(
        report,
        /\| 1k \| Analytics \(new loader\) \| 1000 \| 1\.0 MB \| 1\.50 s \|/
    )
})

test('relationship types go from PTE 1k to PTE 100k and to PTE 1k events', () => {
    const { relationshipTypes } = buildRelationshipMetadata()
    const [toTrackedEntities, toEvents] = relationshipTypes
    const ids = (key) => datasetIds(DATASETS.find((d) => d.key === key))

    relationshipTypes.forEach(({ id, code }) => {
        assert.match(id, UID_REGEX)
        assert.ok(code.startsWith('PTE_'))
    })
    assert.equal(
        toTrackedEntities.fromConstraint.trackedEntityType.id,
        ids('1k').trackedEntityType
    )
    // No programs: the maps-app requests the related tracked entities by type
    assert.deepEqual(toTrackedEntities.toConstraint, {
        relationshipEntity: 'TRACKED_ENTITY_INSTANCE',
        trackedEntityType: { id: ids('100k').trackedEntityType },
    })
    assert.deepEqual(toEvents.toConstraint, {
        relationshipEntity: 'PROGRAM_STAGE_INSTANCE',
        programStage: { id: ids('1k').programStage },
    })
})

test('relationships link the generated tracked entities, deterministically', () => {
    const { relationships } = buildRelationships()
    const sources = buildBatch(pointSet, facilities, 0, 2).trackedEntities
    const targetSet = DATASETS.find(({ key }) => key === '100k')
    const targets = buildBatch(targetSet, facilities, 0, 2).trackedEntities

    assert.equal(
        relationships.length,
        pointSet.count +
            SAME_TYPE_COUNT +
            OUTSIDE_PROGRAM_COUNT +
            DEMO_PAIRS.length
    )
    assert.deepEqual(buildRelationships(), { relationships })
    assert.equal(
        relationships[1].from.trackedEntity.trackedEntity,
        sources[1].trackedEntity
    )
    assert.equal(
        relationships[1].to.trackedEntity.trackedEntity,
        targets[1].trackedEntity
    )
    assert.equal(
        relationships[1].relationshipType,
        relationshipTypeId('toTrackedEntities')
    )
})

test('same type relationships link the newest PTE 100k tracked entities', () => {
    const targetSet = DATASETS.find(({ key }) => key === '100k')
    const sameType = buildRelationships().relationships.slice(
        pointSet.count,
        pointSet.count + SAME_TYPE_COUNT
    )
    const newest = new Set(
        buildBatch(
            targetSet,
            facilities,
            targetSet.count - 2 * SAME_TYPE_COUNT,
            targetSet.count
        ).trackedEntities.map(({ trackedEntity }) => trackedEntity)
    )

    sameType.forEach(({ relationshipType, from, to }) => {
        assert.equal(relationshipType, relationshipTypeId('sameType'))
        assert.ok(newest.has(from.trackedEntity.trackedEntity))
        assert.ok(newest.has(to.trackedEntity.trackedEntity))
    })
})

test('outside program relationships go to PTE 1k tracked entities without enrollment', () => {
    const outside = buildRelationships().relationships.slice(
        pointSet.count + SAME_TYPE_COUNT,
        pointSet.count + SAME_TYPE_COUNT + OUTSIDE_PROGRAM_COUNT
    )
    const { trackedEntities } = buildOutsideProgramTrackedEntities(facilities)

    assert.equal(trackedEntities.length, OUTSIDE_PROGRAM_COUNT)
    trackedEntities.forEach((trackedEntity) => {
        assert.equal(trackedEntity.enrollments, undefined)
        assert.equal(
            trackedEntity.trackedEntityType,
            datasetIds(pointSet).trackedEntityType
        )
    })
    assert.deepEqual(
        outside.map(({ to }) => to.trackedEntity.trackedEntity),
        trackedEntities.map(({ trackedEntity }) => trackedEntity)
    )
    outside.forEach(({ relationshipType }) =>
        assert.equal(relationshipType, relationshipTypeId('outsideProgram'))
    )
})

test('demo relationships copy the focus area to case pairs, without programs', () => {
    const demo = buildRelationships().relationships.slice(
        pointSet.count + SAME_TYPE_COUNT + OUTSIDE_PROGRAM_COUNT
    )

    assert.equal(demo.length, DEMO_PAIRS.length)
    assert.equal(
        new Set(demo.map(({ relationship }) => relationship)).size,
        demo.length
    )
    demo.forEach(({ relationshipType, from, to }, index) => {
        assert.equal(relationshipType, DEMO_RELATIONSHIP_TYPE)
        assert.deepEqual(
            [from.trackedEntity.trackedEntity, to.trackedEntity.trackedEntity],
            DEMO_PAIRS[index]
        )
    })
})

test('test maps: one tracked entity layer each, unique ids and PTE_ codes', () => {
    const maps = buildMaps()

    assert.equal(maps.length, MAPS.length)
    assert.equal(new Set(maps.map(({ id }) => id)).size, maps.length)
    assert.equal(new Set(maps.map(({ code }) => code)).size, maps.length)
    maps.forEach(({ id, code, mapViews }) => {
        assert.match(id, UID_REGEX)
        assert.ok(code.startsWith('PTE_MAP_'))
        assert.equal(mapViews.length, 1)
        assert.equal(mapViews[0].layer, 'trackedEntity')
        assert.equal(mapViews[0].opacity, 0.5)
    })
    // Updates the map this tool created first, instead of adding one
    assert.equal(
        maps.find(({ name }) => name.endsWith('relationship to events')).id,
        uid('map:relationshipToEvents')
    )
})

test('test maps carry the case they test', () => {
    const view = (name) =>
        buildMaps().find((map) => map.name === `PTE test: ${name}`).mapViews[0]
    const relationshipType = (name) =>
        JSON.parse(view(name).config).relationships?.type

    assert.equal(
        relationshipType('related limit'),
        relationshipTypeId('toTrackedEntities')
    )
    assert.equal(
        relationshipType('relationship to events'),
        relationshipTypeId('toEvents')
    )
    assert.equal(
        relationshipType('different types without programs'),
        DEMO.focusToCaseWithoutPrograms
    )
    assert.equal(view('follow-up').followUp, true)
    // No mode saved, so the maps-app default applies
    assert.equal(view('default mode').organisationUnitSelectionMode, undefined)
    assert.equal(
        view('immediate children').organisationUnitSelectionMode,
        'CHILDREN'
    )
    assert.deepEqual(view('immediate children').rows, [
        { dimension: 'ou', items: [{ id: DEMO.kakua }] },
    ])
    assert.deepEqual(JSON.parse(view('active enrollments').config), {
        periodType: 'program',
    })
})

test('cleanup deletes maps and relationship types before what they refer to', () => {
    assert.deepEqual(METADATA_TYPES.slice(0, 3), [
        'maps',
        'relationshipTypes',
        'programStages',
    ])
})
