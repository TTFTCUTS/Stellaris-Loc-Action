import * as core from "@actions/core";
import * as github from "@actions/github";

async function run(): Promise<void> {
    try {
        
        const name: string = core.getInput("who-to-greet");

        console.log(`Hello ${name}!`);

        const time: string = new Date().toTimeString();

        core.setOutput("time", `Time: ${time}`);

        const payload: string = JSON.stringify(github.context.payload, null, 2);

        console.log(`Event payload: ${payload}`);

    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}

run();