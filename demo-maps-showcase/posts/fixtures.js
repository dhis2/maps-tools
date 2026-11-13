// A small Sierra Leone-shaped hierarchy for offline tests: 12 facilities per
// district, one of them without a population value
const { DISTRICTS } = require('../shared/sierraLeone.js')
const { randomFor } = require('../random.js')

const fakeFacilities = () =>
    Object.values(DISTRICTS).flatMap((districtId) =>
        Array.from({ length: 12 }, (_, i) => ({
            id: `${districtId.slice(0, 8)}${String(i).padStart(3, '0')}`,
            name: `Facility ${districtId} ${i}`,
            districtId,
        }))
    )

const fakePopulation = (facilities, years) =>
    Object.fromEntries(
        facilities
            .filter((_, i) => i % 12 !== 11)
            .map(({ id }) => [
                id,
                Object.fromEntries(
                    years.map((year) => [
                        year,
                        Math.round(randomFor('pop', id).between(80, 400)),
                    ])
                ),
            ])
    )

module.exports = { fakeFacilities, fakePopulation }
