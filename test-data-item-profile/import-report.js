// Reads DHIS2 import responses, whose shape moved between versions: newer
// ones wrap the summary in `response`.
const unwrap = (json) => json?.response ?? json

const metadataErrors = (json) =>
    (unwrap(json)?.typeReports ?? []).flatMap((typeReport) =>
        (typeReport.objectReports ?? []).flatMap((objectReport) =>
            (objectReport.errorReports ?? []).map((error) => ({
                type: typeReport.klass?.split('.').pop(),
                id: objectReport.uid,
                errorCode: error.errorCode,
                message: error.message,
            }))
        )
    )

const importCount = (json) => {
    const summary = unwrap(json)
    return {
        status: summary?.status ?? json?.status,
        ...(summary?.importCount ?? {}),
        conflicts: (summary?.conflicts ?? []).map(
            (conflict) =>
                `${conflict.object ?? ''}: ${conflict.value ?? conflict.message}`
        ),
    }
}

module.exports = { importCount, metadataErrors, unwrap }
