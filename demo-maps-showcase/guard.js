// The servers this tool may write to: the public play instances, for drafts,
// and a local one. The dedicated showcase instance joins once it exists.
const WRITABLE = [
    /^https:\/\/play\.im\.dhis2\.org\/[\w-]+$/,
    /^http:\/\/localhost(:\d+)?(\/[\w-]+)?$/,
]

const isWritable = (baseUrl) =>
    WRITABLE.some((pattern) => pattern.test(baseUrl))

const assertWritable = (baseUrl) => {
    if (!isWritable(baseUrl)) {
        throw new Error(
            `Refusing to write to ${baseUrl}: only play instances and localhost are allowed.`
        )
    }
}

module.exports = { assertWritable, isWritable }
