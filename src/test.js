const Az = require('az');
Az.Morph.init('node_modules/az/dicts', function () {
    console.log(Az.Morph('вкус')[0].tag.toString());
    console.log(Az.Morph('вкусный')[0].tag.toString());
    console.log(Az.Morph('вкусная')[0].tag.toString());
    console.log(Az.Morph('укус')[0].tag.toString());
});