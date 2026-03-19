import { program } from "commander";
import { registerBriefing } from "./commands/briefing.js";
import { registerForget } from "./commands/forget.js";
import { registerInit } from "./commands/init.js";
import { registerRecall } from "./commands/recall.js";
import { registerReindex } from "./commands/reindex.js";
import { registerRemember } from "./commands/remember.js";
import { registerSetup } from "./commands/setup.js";
import { registerStatus } from "./commands/status.js";

program.name("axon").description("Memory engine for AI agents").version("0.1.0");

registerInit(program);
registerSetup(program);
registerStatus(program);
registerRemember(program);
registerRecall(program);
registerForget(program);
registerReindex(program);
registerBriefing(program);

// No args + TTY = brain dump mode
const noCommand = process.argv.length === 2;
if (noCommand && process.stdout.isTTY) {
	import("ink").then(({ render }) => {
		import("react").then((React) => {
			import("./components/BrainDump.js").then(({ BrainDump }) => {
				render(React.createElement(BrainDump));
			});
		});
	});
} else {
	program.parse();
}
