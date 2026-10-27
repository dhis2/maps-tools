// One org unit per script, named with a city name written in that script.
// Arabic and Hebrew are right-to-left; the others need glyphs Open Sans lacks.
const SCRIPTS = [
    { key: 'arabic', script: 'Arabic', name: 'القاهرة' },
    { key: 'hebrew', script: 'Hebrew', name: 'ירושלים' },
    { key: 'ethiopic', script: 'Ethiopic', name: 'አዲስ አበባ' },
    { key: 'devanagari', script: 'Devanagari', name: 'काठमाडौं' },
    { key: 'bengali', script: 'Bengali', name: 'ঢাকা' },
    { key: 'oriya', script: 'Oriya', name: 'ଭୁବନେଶ୍ୱର' },
    { key: 'sinhala', script: 'Sinhala', name: 'කොළඹ' },
    { key: 'myanmar', script: 'Myanmar', name: 'ရန်ကုန်' },
    { key: 'thai', script: 'Thai', name: 'กรุงเทพฯ' },
    { key: 'lao', script: 'Lao', name: 'ວຽງຈັນ' },
    { key: 'khmer', script: 'Khmer', name: 'ភ្នំពេញ' },
]

module.exports = { SCRIPTS }
