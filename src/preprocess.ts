import * as process from "./preprocessor";
import * as pathLib from "path";

async function run(): Promise<void> {
    const inputPath: string = pathLib.join("test-data","preprocess");//"gigas_preprocess");//
    const outputPath: string = pathLib.join("test-data","process");//"gigas_process");//
    const sourceLanguage: string = "sourcelang";//"english"//
    const outputLanguages: Array<string> = ["testlang1", "testlang2"];//["braz_por","french","german","polish","russian","simp_chinese","spanish"]//

    await process.preProcessLoc(inputPath, outputPath, sourceLanguage, outputLanguages);
}

run();