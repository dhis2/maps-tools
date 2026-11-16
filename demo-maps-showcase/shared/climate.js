// Monthly CHIRPS rainfall and ERA5-Land temperature per district, from the
// Earth Engine snapshot (input/sierra-leone/climate-districts.json)
const fs = require('node:fs')
const path = require('node:path')

const CLIMATE_FILE = path.join(
    __dirname,
    '..',
    'input',
    'sierra-leone',
    'climate-districts.json'
)

const readClimate = () => {
    const { rain, temperature, normal } = JSON.parse(
        fs.readFileSync(CLIMATE_FILE, 'utf8')
    )
    const months = Object.keys(rain).sort()

    // A month after the snapshot's last one takes the same calendar month
    // of the latest year the snapshot has
    const monthFor = (monthId) => {
        if (rain[monthId]) {
            return monthId
        }
        const calendarMonth = monthId.slice(4)
        return months.filter((m) => m.endsWith(calendarMonth)).at(-1)
    }

    return {
        lastMonth: months.at(-1),
        rain: (districtId, monthId) => rain[monthFor(monthId)][districtId],
        temperature: (districtId, monthId) =>
            temperature[monthFor(monthId)][districtId],
        // calendarMonth: 1 to 12
        normal: (districtId, calendarMonth) =>
            normal[calendarMonth][districtId],
    }
}

module.exports = { readClimate }
