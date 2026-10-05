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
// base URL (stable-2-43-1, dev-2-42, maps-app-43-1…), or --instance.
const instanceName = (baseUrl, override) =>
    override || baseUrl.split('/').filter(Boolean).pop().replace(/:/g, '-')

const getConfig = (argv = process.argv.slice(2)) => {
    const args = parseArgs(argv)
    const baseUrl = (
        args.baseUrl ||
        process.env.DHIS2_BASE_URL ||
        'http://localhost:8080'
    ).replace(/\/$/, '')

    return {
        baseUrl,
        username: args.username || process.env.DHIS2_USERNAME || 'admin',
        password: args.password || process.env.DHIS2_PASSWORD || 'district',
        instance: instanceName(baseUrl, args.instance),
        dryRun: !!args.dryRun,
        debug: !!args.debug,
        // Comma-separated group numbers or keys; every group by default.
        groups: typeof args.groups === 'string' ? args.groups.split(',') : [],
        concurrency: toInt(args.concurrency, 4),
        pollSeconds: toInt(args.pollSeconds, 10),
        maxWaitMinutes: toInt(args.maxWaitMinutes, 90),
    }
}

module.exports = { getConfig, parseArgs }
