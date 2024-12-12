function getSoundex(str, scale, mysql) {
    scale = scale || false;
    mysql = mysql || false;

    if (!str) return '';

    var split = String(str).toUpperCase().replace(/[^A-Z]/g, '').split('');
    var map = {
        BFPV: 1,
        CGJKQSXZ: 2,
        DT: 3,
        L: 4,
        MN: 5,
        R: 6
    };

    var vowels = ['A', 'E', 'I', 'O', 'U'];
    var keys = Object.keys(map).reverse();

    var build = split.map(function(letter, index) {
        if (letter === 'W'&& index > 0 && vowels.includes(split[index - 1])) {
            return 1; // Assign key 1 if W comes after a vowel
        }

        for (var num in keys) {
            if (keys[num].indexOf(letter) !== -1) {
                return map[keys[num]];
            }
        }
        return null;
    });

    if (mysql) {
        build = build.filter(function(key) {
            return key;
        });
    }

    var first = build.splice(0, 1)[0];
    build = build.filter(function(num, index, array) {
        return (index === 0) ? num !== first : num !== array[index - 1];
    });

    var len = build.length;
    var maxLength = 6;
    var max = scale
        ? Math.min(Math.max(~~((mysql ? len : len * 2 / 3.5)), maxLength), maxLength)
        : maxLength;

    var soundexCode = split[0] + build.join('');

    // Replace first letter conditions
    if (soundexCode[0] === 'E') {
        soundexCode = 'I' + soundexCode.slice(1);
    } else if (soundexCode[0] === 'O') {
        soundexCode = 'U' + soundexCode.slice(1);
    }

    return soundexCode.slice(0, max).replace(/0+$/, '');
}

if (typeof exports !== 'undefined') {
    module.exports = {
        getSoundex: getSoundex
    };
} else {
    this['Soundex'] = getSoundex;
}
