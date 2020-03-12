import axios from 'axios';
const Az = require('az');

const SEX_QUERY = 'masc';

export class GenerateNameUtil {
    private static instance: GenerateNameUtil;

    private constructor() { }

    public static getInstance(): GenerateNameUtil {
        if (!GenerateNameUtil.instance)
            GenerateNameUtil.instance = new GenerateNameUtil();

        return GenerateNameUtil.instance;
    }

    public async generateName(): Promise<string> {
        let word1: string;
        let word2: string;
        let word3: string;

        do {
            word1 = await this.generateWord(1);
        } while ((await this.checkSex(word1)) !== SEX_QUERY);

        do {
            word2 = await this.generateWord(2);
        } while ((await this.checkSex(word2)) !== SEX_QUERY);

        do {
            word3 = await this.generateWord(2);
        } while ((await this.checkSex(word3)) !== SEX_QUERY);

        return `${word3} ${word2} ${word1}`;
    }

    private async checkSex(word: string): Promise<string> {
        return new Promise((resolve, reject) => {
            setTimeout(() => reject('Generate name timeout'), 10000);

            Az.Morph.init('node_modules/az/dicts', () => {
                resolve(Az.Morph(word)[0].tag.GNdr);
            });
        });
    }

    private async generateWord(type: number): Promise<string> {
        const response = await axios.get(`http://free-generator.ru/generator.php?action=word&type=${type}`);
        return response.data.word.word;
    }
}