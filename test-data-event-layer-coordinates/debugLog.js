const fs = require('node:fs')
const path = require('node:path')

const DEBUG_LOG_PATH = path.join(__dirname, 'output', 'debug.log')

// Debug output (raw API responses, full task lists) can be too large to
// usefully paste into a terminal/chat. Writing it to a file instead lets it
// be inspected directly (cat, grep, a text editor) without needing to copy
// it anywhere. Truncates the file at the start of each run so it never
// mixes output from an old run with the current one.
const createDebugLog = (enabled) => {
    if (!enabled) {
        return () => {}
    }
    fs.mkdirSync(path.dirname(DEBUG_LOG_PATH), { recursive: true })
    fs.writeFileSync(DEBUG_LOG_PATH, '')
    return (...parts) => {
        const line = parts
            .map((part) =>
                typeof part === 'string' ? part : JSON.stringify(part, null, 2)
            )
            .join(' ')
        fs.appendFileSync(DEBUG_LOG_PATH, line + '\n')
    }
}

module.exports = { createDebugLog, DEBUG_LOG_PATH }
