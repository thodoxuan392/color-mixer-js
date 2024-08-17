import { Device } from "./device";
import { program } from "commander";
import * as readline from "readline";
import {
	BaseInterface,
	BaseResultInterface,
	ControlDoorCommandEnum,
	MixColorCommandEnum,
	ProtocolId,
	PushColorCommandEnum,
	Request,
	Response,
} from "./interface";
import { Logger } from "./logger";
import { Observable, Subscription } from "rxjs";

let observable: Observable<Response>;
let subscription: Subscription;

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
});

const logger = Logger.getLogger();
const device = new Device();

program.version("1.0.0").description("Color Mixer CLI");

type CommandDescriptor = {
	command: string;
	description: string;
	callbackFunction: (payload: Request) => Promise<Response>;
	payload: Request;
};

const commandDescriptorTable: CommandDescriptor[] = [
	{
		command: "request-version",
		description: "Request version from Controller Box",
		callbackFunction: device.requestVersion.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_REQUEST_VERSION,
		},
	},
	{
		command: "get-setting",
		description: "Get setting from Controller Box",
		callbackFunction: device.getSetting.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_GET_SETTING,
		},
	},
	{
		command: "change-color-volume",
		description: "Change color volume from Controller Box",
		callbackFunction: async (payload) => {
			let response: Response;
			for (let index = 1; index <= 16; index++) {
				response = await device.changeColorVolume({
					protocolId: ProtocolId.PROTOCOL_ID_CMD_CHANGE_COLOR_VOLUME,
					pipeLineId: index,
					volume: 1000,
				});
				logger.info(
					`Change color volume got result ${JSON.stringify(response)}`
				);
			}
			return response;
		},
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_CHANGE_COLOR_VOLUME,
			volume: 1000, // 1000 ml
		},
	},
	{
		command: "start-push-color",
		description: "Start push color from Controller Box",
		callbackFunction: device.pushColor.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_PUSH_COLOR_COMMAND,
			command: PushColorCommandEnum.PUSH_COLOR_COMMAND_START,
		},
	},
	{
		command: "stop-push-color",
		description: "Stop push color from Controller Box",
		callbackFunction: device.pushColor.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_PUSH_COLOR_COMMAND,
			command: PushColorCommandEnum.PUSH_COLOR_COMMAND_STOP,
		},
	},
	{
		command: "pause-push-color",
		description: "Pause push color from Controller Box",
		callbackFunction: device.pushColor.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_PUSH_COLOR_COMMAND,
			command: PushColorCommandEnum.PUSH_COLOR_COMMAND_PAUSE,
		},
	},
	{
		command: "resume-push-color",
		description: "Resume push color from Controller Box",
		callbackFunction: device.pushColor.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_PUSH_COLOR_COMMAND,
			command: PushColorCommandEnum.PUSH_COLOR_COMMAND_RESUME,
		},
	},
	{
		command: "start-mix-color",
		description: "Mix color from Controller Box",
		callbackFunction: device.mixColor.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_MIX_COLOR_COMMAND,
			command: MixColorCommandEnum.MIX_COLOR_COMMAND_START,
		},
	},
	{
		command: "stop-mix-color",
		description: "Mix color from Controller Box",
		callbackFunction: device.mixColor.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_MIX_COLOR_COMMAND,
			command: MixColorCommandEnum.MIX_COLOR_COMMAND_STOP,
		},
	},
	{
		command: "pause-mix-color",
		description: "Mix color from Controller Box",
		callbackFunction: device.mixColor.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_MIX_COLOR_COMMAND,
			command: MixColorCommandEnum.MIX_COLOR_COMMAND_PAUSE,
		},
	},
	{
		command: "resume-mix-color",
		description: "Mix color from Controller Box",
		callbackFunction: device.mixColor.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_MIX_COLOR_COMMAND,
			command: MixColorCommandEnum.MIX_COLOR_COMMAND_RESUME,
		},
	},
	{
		command: "open-door ",
		description: "Door Control from Controller Box",
		callbackFunction: device.controlDoor.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_DOOR_CONTROL,
			command: ControlDoorCommandEnum.CONTROL_DOOR_COMMAND_OPEN,
		},
	},
	{
		command: "close-door",
		description: "Door Control from Controller Box",
		callbackFunction: device.controlDoor.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_DOOR_CONTROL,
			command: ControlDoorCommandEnum.CONTROL_DOOR_COMMAND_CLOSE,
		},
	},
	{
		command: "get-usage-time",
		description: "Get usage time from Controller Box",
		callbackFunction: device.controlDoor.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_GET_USAGE_TIME,
		},
	},
	{
		command: "set-usage-time",
		description: "Door Control from Controller Box",
		callbackFunction: device.controlDoor.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_SET_USAGE_TIME,
			usageTime: 10 * 24 * 60, // 10 days
		},
	},
];

commandDescriptorTable.forEach((commandDescriptor) => {
	// Define your commands here
	program
		.command(commandDescriptor.command)
		.description(commandDescriptor.description)
		.action(async () => {
			try {
				logger.info(
					`Executing command ${commandDescriptor.command} ...`
				);
				const result = await commandDescriptor.callbackFunction(
					commandDescriptor.payload
				);
				logger.info(
					`Executing command got result ${JSON.stringify(result)}`
				);
			} catch (e) {
				logger.error(
					`Executing command ${commandDescriptor.command} failed`,
					e
				);
			}
		});
});

const listCommands = () => {
	console.log("Available commands:");
	program.commands.forEach((command) => {
		console.log(`  ${command.name()} - ${command.description()}`);
	});
};

program
	.command("enable-listener")
	.description("Enable Listener to Device")
	.action(() => {
		subscription = observable.subscribe((response) => {
			logger.info(`Device response ${JSON.stringify(response)}`);
		});
	});

program
	.command("disable-listener")
	.description("Disable Listener to Device")
	.action(() => {
		if (subscription) {
			subscription.unsubscribe();
		}
	});

program
	.command("help")
	.description("List available commands")
	.action(listCommands);

const handleInput = (input: string) => {
	const command = input.trim();
	if (command) {
		program.parse([process.argv[0], process.argv[1], command]);
	}
	rl.question("Enter a command: ", handleInput);
};

device.start();
observable = device.getObservable();

// Start the input loop
rl.question("Enter a command: ", handleInput);
