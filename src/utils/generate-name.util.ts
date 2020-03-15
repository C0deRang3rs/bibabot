import axios from 'axios';
// @ts-ignore
import Az from 'az';

const SEX_QUERY = 'masc';

export default class GenerateNameUtil {
  private static instance: GenerateNameUtil;

  public static getInstance(): GenerateNameUtil {
    if (!GenerateNameUtil.instance) GenerateNameUtil.instance = new GenerateNameUtil();

    return GenerateNameUtil.instance;
  }

  public static async generateName(): Promise<string> {
    let word1: string;
    let word2: string;
    let word3: string;

    do {
      word1 = await GenerateNameUtil.generateWord(1);
    } while (await GenerateNameUtil.checkSex(word1) !== SEX_QUERY);

    do {
      word2 = await GenerateNameUtil.generateWord(2);
    } while (await GenerateNameUtil.checkSex(word2) !== SEX_QUERY);

    do {
      word3 = await GenerateNameUtil.generateWord(2);
    } while (await GenerateNameUtil.checkSex(word3) !== SEX_QUERY);

    return `${word3} ${word2} ${word1}`;
  }

  private static async checkSex(word: string): Promise<string> {
    return new Promise((resolve, reject) => {
      setTimeout(() => reject(new Error('Generate name timeout')), 10000);

      Az.Morph.init('node_modules/az/dicts', () => {
        resolve(Az.Morph(word)[0].tag.GNdr);
      });
    });
  }

  private static async generateWord(type: number): Promise<string> {
    const response = await axios.get(`http://free-generator.ru/generator.php?action=word&type=${type}`);
    return response.data.word.word;
  }
}
