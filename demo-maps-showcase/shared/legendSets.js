const { PUBLIC_READ, code, uid } = require('./ids.js')

// legends: [{ name, start, end, color }], with start included and end excluded
const legendSet = ({ key, name, legends }) => ({
    id: uid(`legendSet:${key}`),
    code: code(`LEGEND_${key}`),
    name,
    sharing: PUBLIC_READ,
    legends: legends.map(({ name: legendName, start, end, color }, i) => ({
        id: uid(`legendSet:${key}:${i}`),
        name: legendName,
        startValue: start,
        endValue: end,
        color,
    })),
})

module.exports = { legendSet }
