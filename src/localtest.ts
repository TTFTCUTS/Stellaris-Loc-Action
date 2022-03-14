import * as process from "./processor";
import * as pathLib from "path";

async function run(): Promise<void> {
    const relativePath: string = pathLib.join("test-data","process");//"gigas_process");//
    const sourceLanguage: string = "sourcelang";//"english";//
    const outputLanguages: Array<string> = ["testlang1", "testlang2"];//["braz_por","french","german","polish","russian","simp_chinese","spanish"]//

    await process.processLoc(relativePath, sourceLanguage, outputLanguages);
}

run();