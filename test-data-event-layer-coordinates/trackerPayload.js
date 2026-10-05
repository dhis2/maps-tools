const { pointForChannel, coordinateValue } = require('./geometry.js')
const { PSI, OU, PI, TEI } = require('./resolve.js')
const { getEventScenarios, getEnrollmentScenarios } = require('./scenarios.js')
const { deterministicUid } = require('./uid.js')

const uid = (seed) => deterministicUid(`maps-test:${seed}`)

const TODAY = new Date().toISOString().slice(0, 10)

// Builds the event-level geometry, dataValues, and points map (candidate
// field id -> its known [lon, lat] or null) for one event-level scenario.
// `points` and the actual written geometry/dataValues are derived from the
// exact same coordinates, so verify.js can compare a resolved geometry
// against the coordinate a specific candidate field is known to carry.
const buildEventFields = ({ flags, globalIndex, baseCoords, ids, ouPoint }) => {
    const orgUnit = flags.orgUnitHasGeometry
        ? ids.ouWithGeometry
        : ids.ouNoGeometry
    const psiPoint = flags.eventGeometry
        ? pointForChannel(baseCoords, 'psigeometry', { index: globalIndex })
        : null
    const deCoordinatePoint = flags.deCoordinate
        ? pointForChannel(baseCoords, 'deCoordinate', { index: globalIndex })
        : null

    const dataValues = []
    if (deCoordinatePoint) {
        dataValues.push({
            dataElement: ids.deCoordinate,
            value: coordinateValue(deCoordinatePoint),
        })
    }
    if (flags.deOrgUnit) {
        dataValues.push({
            dataElement: ids.deOrgUnit,
            value: ids.ouWithGeometry,
        })
    }

    return {
        orgUnit,
        geometry: psiPoint
            ? { type: 'Point', coordinates: psiPoint }
            : undefined,
        dataValues,
        points: {
            [PSI]: psiPoint,
            [OU]: flags.orgUnitHasGeometry ? ouPoint : null,
            [ids.deCoordinate]: deCoordinatePoint,
            [ids.deOrgUnit]: flags.deOrgUnit ? ouPoint : null,
        },
    }
}

// Builds enrollment/TEI-level geometry, attributes, and points map for one
// enrollment-level scenario - same coordinate-sharing principle as above.
const buildEnrollmentFields = ({ flags, index, baseCoords, ids, ouPoint }) => {
    const pointOpts = { index, step: 0.05, gridSize: 4 }
    const piPoint = flags.enrollmentGeometry
        ? pointForChannel(baseCoords, 'pigeometry', pointOpts)
        : null
    const teiPoint = flags.teiGeometry
        ? pointForChannel(baseCoords, 'teigeometry', pointOpts)
        : null
    const teaCoordinatePoint = flags.teaCoordinate
        ? pointForChannel(baseCoords, 'teaCoordinate', pointOpts)
        : null

    const attributes = []
    if (teaCoordinatePoint) {
        attributes.push({
            attribute: ids.teaCoordinate,
            value: coordinateValue(teaCoordinatePoint),
        })
    }
    if (flags.teaOrgUnit) {
        attributes.push({
            attribute: ids.teaOrgUnit,
            value: ids.ouWithGeometry,
        })
    }

    return {
        piPoint,
        teiPoint,
        attributes,
        points: {
            [PI]: piPoint,
            [TEI]: teiPoint,
            [ids.teaCoordinate]: teaCoordinatePoint,
            [ids.teaOrgUnit]: flags.teaOrgUnit ? ouPoint : null,
        },
    }
}

// Builds the full /api/tracker payload: standalone events for the event
// program, and TEIs/enrollments/events for the tracker program, covering
// the full cartesian product of scenario flags.
const buildTrackerPayload = ({ ids, baseCoords }) => {
    const eventScenarios = getEventScenarios()
    const enrollmentScenarios = getEnrollmentScenarios()
    // Must match the "with geometry" org unit's own geometry in metadata.js
    // (same channel, same base, same index) so ougeometry resolution can be
    // verified by coordinate.
    const ouPoint = pointForChannel(baseCoords, 'ougeometry')

    const trackedEntities = []
    const enrollments = []
    const events = []
    const scenarioIndex = []

    // Standalone event-program events
    eventScenarios.forEach((scenario) => {
        const scenarioCode = `STANDALONE__${scenario.code}`
        const event = buildEventFields({
            flags: scenario.flags,
            globalIndex: scenario.index,
            baseCoords,
            ids,
            ouPoint,
        })
        const eventId = uid(`event:standalone:${scenario.code}`)

        events.push({
            event: eventId,
            program: ids.eventProgram,
            programStage: ids.eventProgramStage,
            status: 'COMPLETED',
            occurredAt: TODAY,
            orgUnit: event.orgUnit,
            geometry: event.geometry,
            dataValues: [
                ...event.dataValues,
                { dataElement: ids.deScenarioCode, value: scenarioCode },
            ],
        })

        scenarioIndex.push({
            type: 'event',
            program: 'Maps Test Coordinates (Event)',
            eventId,
            orgUnit: event.orgUnit,
            scenarioCode,
            flags: scenario.flags,
            points: event.points,
        })
    })

    // Tracker program: one TEI + enrollment per enrollment-level scenario,
    // each with one event per event-level scenario underneath it.
    enrollmentScenarios.forEach((enrollmentScenario) => {
        const teiId = uid(`tei:${enrollmentScenario.code}`)
        const enrollmentId = uid(`enrollment:${enrollmentScenario.code}`)
        const { flags } = enrollmentScenario

        const enrollmentFields = buildEnrollmentFields({
            flags,
            index: enrollmentScenario.index,
            baseCoords,
            ids,
            ouPoint,
        })

        trackedEntities.push({
            trackedEntity: teiId,
            trackedEntityType: ids.trackedEntityType,
            orgUnit: ids.ouWithGeometry,
            geometry: enrollmentFields.teiPoint
                ? { type: 'Point', coordinates: enrollmentFields.teiPoint }
                : undefined,
            attributes: [
                ...enrollmentFields.attributes,
                {
                    attribute: ids.teaScenarioCode,
                    value: enrollmentScenario.code,
                },
            ],
        })

        enrollments.push({
            enrollment: enrollmentId,
            trackedEntity: teiId,
            program: ids.trackerProgram,
            orgUnit: ids.ouWithGeometry,
            status: 'ACTIVE',
            enrolledAt: TODAY,
            occurredAt: TODAY,
            geometry: enrollmentFields.piPoint
                ? { type: 'Point', coordinates: enrollmentFields.piPoint }
                : undefined,
        })

        scenarioIndex.push({
            type: 'enrollment',
            program: 'Maps Test Coordinates (Tracker)',
            trackedEntityId: teiId,
            enrollmentId,
            orgUnit: ids.ouWithGeometry,
            scenarioCode: enrollmentScenario.code,
            flags,
        })

        eventScenarios.forEach((eventScenario) => {
            const scenarioCode = `${enrollmentScenario.code}__${eventScenario.code}`
            const globalIndex =
                enrollmentScenario.index * eventScenarios.length +
                eventScenario.index
            const event = buildEventFields({
                flags: eventScenario.flags,
                globalIndex,
                baseCoords,
                ids,
                ouPoint,
            })
            const eventId = uid(`event:tracker:${scenarioCode}`)

            events.push({
                event: eventId,
                enrollment: enrollmentId,
                program: ids.trackerProgram,
                programStage: ids.trackerProgramStage,
                status: 'COMPLETED',
                occurredAt: TODAY,
                orgUnit: event.orgUnit,
                geometry: event.geometry,
                dataValues: [
                    ...event.dataValues,
                    { dataElement: ids.deScenarioCode, value: scenarioCode },
                ],
            })

            scenarioIndex.push({
                type: 'event',
                program: 'Maps Test Coordinates (Tracker)',
                eventId,
                enrollmentId,
                trackedEntityId: teiId,
                orgUnit: event.orgUnit,
                scenarioCode,
                flags: { ...flags, ...eventScenario.flags },
                points: { ...enrollmentFields.points, ...event.points },
            })
        })
    })

    return { trackedEntities, enrollments, events, scenarioIndex }
}

module.exports = { buildTrackerPayload }
