import request from 'request-promise';
const Az = require('az');

export class GenerateNameService {
    private static instance: GenerateNameService;

    public static getInstance(): GenerateNameService {
        if (!GenerateNameService.instance) 
            GenerateNameService.instance = new GenerateNameService();
            
        return GenerateNameService.instance;
    }

    public async generateName() {
        const words = await this.generateWords();

        Az.Morph.init('node_modules/az/dicts', () => {
            const wordMap = {
                'Nouns': {'neut': [], 'femn': [], 'masc': [],},
                'ADJF': {'neut': [], 'femn': [], 'masc': [],},
            } as any;

            words.forEach(word => {
                const parse = Az.Morph(word)[0].tag.toString();
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
                    const mapN = wordMap['Nouns'][sex];
                    const mapA = wordMap['ADJF'][sex];
                    return `${mapA.pop()} ${mapA.pop()} ${mapN.pop()}`;
                }
            });
        });
    }

    private async generateWords() {
        const tmp = [];

        for (let i = 0; i < 10; i++) {
            tmp.push(await this.getWord(1));
            tmp.push(await this.getWord(2));
        }

        return tmp;
    }

    private async getWord(type: number) {
        const response = await request.get({ url: `http://free-generator.ru/generator.php?action=word&type=${type}` })
        return JSON.parse(response)['word']['word'];
    }
}