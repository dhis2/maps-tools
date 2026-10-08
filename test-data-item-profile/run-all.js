// One instance end to end: import, analytics tables, verify, report.
const { getConfig } = require('./config.js')
const importData = require('./index.js')
const report = require('./report.js')
const analytics = require('./run-analytics.js')
const verify = require('./verify.js')

const minutesSince = (start) => ((Date.now() - start) / 60000).toFixed(1)

const run = async (config = getConfig()) => {
    const start = Date.now()
    const steps = [
        ['import', () => importData.run(config)],
        ['analytics', () => analytics.run(config)],
        ['verify', () => verify.run(config)],
        ['report', () => report.run()],
    ]
    for (const [name, step] of steps) {
        const stepStart = Date.now()
        console.log(`\n=== ${name} (${config.instance}) ===`)
        await step()
        console.log(`=== ${name} done in ${minutesSince(stepStart)} min ===`)
    }
    console.log(`\n${config.instance}: all done in ${minutesSince(start)} min.`)
}

if (require.main === module) {
    run().catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
}

module.exports = { run }
