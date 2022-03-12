import * as process from "./preprocessor";
import * as pathLib from "path";

async function run(): Promise<void> {
    const inputPath: string = pathLib.join("test-data","gigas_preprocess");//"preprocess"
    const outputPath: string = pathLib.join("test-data","gigas_process");//"process"
    const sourceLanguage: string = "english"//"sourcelang";
    const outputLanguages: Array<string> = ["braz_por","french","german","polish","russian","simp_chinese","spanish"]//["testlang1", "testlang2"];

    await process.preProcessLoc(inputPath, outputPath, sourceLanguage, outputLanguages);
}

run();