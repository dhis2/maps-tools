// The servers this tool may write to: the public play instances, one dev
// instance, and a local one. Everything else is read only, including
// dev.im.dhis2.org/analytics-dev.
const WRITABLE = [
    /^https:\/\/play\.im\.dhis2\.org\/[\w-]+$/,
    /^https:\/\/dev\.im\.dhis2\.org\/maps-app-43-1$/,
    /^http:\/\/localhost(:\d+)?(\/[\w-]+)?$/,
]

const isWritable = (baseUrl) =>
    WRITABLE.some((pattern) => pattern.test(baseUrl))

const assertWritable = (baseUrl) => {
    if (!isWritable(baseUrl)) {
        throw new Error(
            `Refusing to write to ${baseUrl}: only play instances, dev.im.dhis2.org/maps-app-43-1 and localhost are allowed.`
        )
    }
}

module.exports = { assertWritable, isWritable }
