// One colour-blind-safe palette for every legend set (ColorBrewer RdYlBu,
// with purple and grey). The posts say "green" for on target: it is blue here,
// since red and green are the pair most colour-blind readers confuse.
const PALETTE = {
    act: '#d73027',
    watch: '#fc8d59',
    target: '#4575b4',
    check: '#762a83',
    noData: '#bdbdbd',
}

// Classes without a legend set must use a ColorBrewer palette maps-app offers
// (colorScales in its src/util/colors.js), or its Style tab crashes
const CLASS_SCALES = {
    reds3: '#fee0d2,#fc9272,#de2d26',
}

module.exports = { CLASS_SCALES, PALETTE }
