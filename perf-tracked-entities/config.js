const parseArgs = (argv) => {
    const args = {}
    argv.forEach((arg) => {
        if (!arg.startsWith('--')) {
            return
        }
        const body = arg.slice(2)
        const eqIndex = body.indexOf('=')
        const key = eqIndex === -1 ? body : body.slice(0, eqIndex)
        args[key] = eqIndex === -1 ? true : body.slice(eqIndex + 1)
    })
    return args
}

const toInt = (value, fallback) => (value ? parseInt(value, 10) : fallback)

// The instance name used for results/<instance>/: the last part of the
// base URL (maps-app-43-1, stable-2-43-1…), or --instance.
const instanceName = (baseUrl, override) =>
    override || baseUrl.split('/').filter(Boolean).pop().replace(/:/g, '-')

const getConfig = (argv = process.argv.slice(2)) => {
    const args = parseArgs(argv)
    const baseUrl = (
        args.baseUrl ||
        process.env.DHIS2_BASE_URL ||
        'https://dev.im.dhis2.org/maps-app-43-1'
    ).replace(/\/$/, '')

    return {
        baseUrl,
        username: args.username || process.env.DHIS2_USERNAME || 'admin',
        password: args.password || process.env.DHIS2_PASSWORD || 'district',
        instance: instanceName(baseUrl, args.instance),
        dryRun: !!args.dryRun,
        // Only the relationship types, relationships and saved map, for the
        // 1k and 100k datasets imported before
        relationships: !!args.relationships,
        // Only the test maps
        maps: !!args.maps,
        // Comma-separated dataset keys (1k,10k…); every dataset by default.
        datasets:
            typeof args.datasets === 'string' ? args.datasets.split(',') : [],
        batchSize: toInt(args.batchSize, 1000),
        repeats: toInt(args.repeats, 3),
        timeoutSeconds: toInt(args.timeoutSeconds, 300),
        pollSeconds: toInt(args.pollSeconds, 10),
        maxWaitMinutes: toInt(args.maxWaitMinutes, 90),
    }
}

module.exports = { getConfig, parseArgs }
