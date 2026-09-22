// Mirrors the coordinate-field constants in src/constants/layers.js. The
// main field always takes precedence and is tried first; the fixed cascade
// only applies once the main field has no geometry - confirmed with the
// ticket owner.
//
// CASCADE_WITH_TEI order is Event > Enrollment > TrackedEntity > OrgUnit,
// confirmed empirically against a real instance (verify.js): every
// scenario with both enrollment AND event geometry present resolved to the
// EVENT's coordinate, not the enrollment's. CoordinateField.jsx's help
// text originally said the opposite ("Enrollment > event > ...") - that
// was a UI copy bug, now fixed to match this (the backend's) order.
const PSI = 'psigeometry'
const OU = 'ougeometry'
const PI = 'pigeometry'
const TEI = 'teigeometry'
const CASCADING = 'cascading'

const CASCADE_WITH_TEI = [PSI, PI, TEI, OU]
const CASCADE_WITHOUT_TEI = [PSI, OU]

// `points` maps every candidate field id (the 4 built-ins plus whichever
// custom DE/TEA ids are in play) to that event's known [lon, lat] for that
// field, or null if the field has no data on this event - see
// trackerPayload.js, which builds this map from the same channel-distinct
// coordinates it writes into the imported data. Returns the field id and
// coordinate the server is expected to resolve `geometry` to, or
// { field: null, point: null } if no configured source has data.
const resolveExpected = ({ points, hasTei, mainField, fallbackField }) => {
    if (points[mainField]) {
        return { field: mainField, point: points[mainField] }
    }
    if (fallbackField === CASCADING) {
        const chain = hasTei ? CASCADE_WITH_TEI : CASCADE_WITHOUT_TEI
        const field = chain.find((candidate) => points[candidate])
        return field
            ? { field, point: points[field] }
            : { field: null, point: null }
    }
    if (fallbackField && points[fallbackField]) {
        return { field: fallbackField, point: points[fallbackField] }
    }
    return { field: null, point: null }
}

module.exports = {
    resolveExpected,
    PSI,
    OU,
    PI,
    TEI,
    CASCADING,
}
