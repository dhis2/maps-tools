// Error and count helpers for import reports, which some versions nest
// under `response`.

const metadataErrors = (json) => {
    const report = json?.response ?? json
    return (report?.typeReports ?? []).flatMap((typeReport) =>
        (typeReport.objectReports ?? []).flatMap((objectReport) =>
            (objectReport.errorReports ?? []).map(
                (error) =>
                    `${typeReport.klass?.split('.').pop()}: ${error.message}`
            )
        )
    )
}

const trackerStats = (json) => {
    const report = json?.response ?? json
    return {
        status: report?.status,
        created: report?.stats?.created ?? 0,
        updated: report?.stats?.updated ?? 0,
        deleted: report?.stats?.deleted ?? 0,
        ignored: report?.stats?.ignored ?? 0,
        errors: (report?.validationReport?.errorReports ?? []).map(
            (error) => error.message
        ),
    }
}

module.exports = { metadataErrors, trackerStats }
