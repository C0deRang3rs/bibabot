const request = require('request-promise');
const Az = require('az');

async function getWord(type) {
    return new Promise(resolve => {
        request.get({
            url: `http://free-generator.ru/generator.php?action=word&type=${type}`
        }).then((body) => {
            resolve(JSON.parse(body)['word']['word']);
        });
    });
}

async function generateWords() {
    let tmp = [];
    for (let i = 0; i < 10; i++) {
        tmp.push(await getWord(1));
        tmp.push(await getWord(2));
    }
    return tmp;
}


module.exports = async function () {
    return new Promise((resolve, reject) => {
        generateWords().then((res) => {
            Az.Morph.init('node_modules/az/dicts', function () {

                let wordMap = {
                    'Nouns': {'neut': [], 'femn': [], 'masc': [],},
                    'ADJF': {'neut': [], 'femn': [], 'masc': [],},
                };

                res.forEach(word => {
                    let parse;
                    try {
                        parse = Az.Morph(word)[0].tag.toString();
                    } catch (e) {
                        return reject(e);
                    }
                    ['masc', 'femn', 'neut'].forEach(sex => {
                        if (parse.includes(sex) && parse.includes('NOUN')) {
                            wordMap['Nouns'][sex].push(word);
                        } else if (parse.includes(sex) && parse.includes('ADJF')) {
                            wordMap['ADJF'][sex].push(word);
                        }
                    })
                });

                ['masc', 'femn', 'neut'].forEach(sex => {
                    if (wordMap['Nouns'][sex].length >= 1 && wordMap['ADJF'][sex].length >= 2) {
                        let mapN = wordMap['Nouns'][sex],
                            mapA = wordMap['ADJF'][sex];
                        resolve(`${mapA.pop()} ${mapA.pop()} ${mapN.pop()}`);
                    }
                });

            });
        });
    })
};