// A small Sierra Leone-shaped hierarchy for offline tests: 12 facilities per
// district in 2 chiefdoms, one of them without a population value, all with
// a point
const { DISTRICTS } = require('../shared/sierraLeone.js')
const { randomFor } = require('../random.js')

const fakeFacilities = () =>
    Object.values(DISTRICTS).flatMap((districtId) =>
        Array.from({ length: 12 }, (_, i) => ({
            id: `${districtId.slice(0, 8)}${String(i).padStart(3, '0')}`,
            name: `Facility ${districtId} ${i}`,
            districtId,
            chiefdomId: `${districtId.slice(0, 9)}c${i % 2}`,
        }))
    )

const fakePoints = (facilities) =>
    Object.fromEntries(
        facilities.map(({ id }) => {
            const random = randomFor('point', id)
            return [id, [random.between(-13, -10.5), random.between(7, 10)]]
        })
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

module.exports = { fakeFacilities, fakePoints, fakePopulation }
