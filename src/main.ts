import { Device } from "./device";
import { program } from "commander";
import * as readline from "readline";
import {
	BaseInterface,
	BaseResultInterface,
	ControlDoorCommandEnum,
	MixColorCommandEnum,
	PipelineSetting,
	ProtocolId,
	PushColorCommandEnum,
	PushColorFlowCommand,
	Request,
	Response,
	SyncTime,
	SyncTimeResult,
	UpdateSetting,
} from "./interface";
import { Logger } from "./logger";
import { Observable, Subscription } from "rxjs";
import { generateRandomNumberArray } from "./utils";

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
		command: "reset",
		description: "Reset",
		callbackFunction: device.reset.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_RESET,
		},
	},
	{
		command: "ping",
		description: "Ping to Controller Box to keep connection",
		callbackFunction: device.ping.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_PING,
		},
	},
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
		command: "update-setting",
		description: "Update setting from Controller Box",
		callbackFunction: async (payload) => {
			const pipelineSetting: PipelineSetting = {
				pulCoefficient: 1,
				pulPer1ms: 100,
				pulPer01ms: 10,
				pulPer001ms: 1,
				tOnForPushColor: 1000, // 500us ~ 2Khz
			};
			var pipeLineSettings = new Array<PipelineSetting>();
			for (let index = 0; index < 16; index++) {
				pipeLineSettings.push(pipelineSetting);
			}
			const updateSetting: UpdateSetting = {
				protocolId: ProtocolId.PROTOCOL_ID_CMD_UPDATE_SETTING,
				pipeLineSettings,
				closeDoorAngle: 50,
				openDoorAngle: 50,
				tOnForMixColor: 1000, // 500us ~ 2kHz
				mixerSpeedLowLevel: 60, // 20% of 2kHz = 400Hz
				mixerSpeedMediumLevel: 80, // 40% of 2kHz = 800Hz
				mixerSpeedHighLevel: 100, // 80% of
				mixerSpeedCurrLevel: 2, // 0: Low , 1: Medium, 2: High
			};
			const result = await device.updateSetting(updateSetting);
			return result;
		},
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_UPDATE_SETTING,
		},
	},
	{
		command: "sync-time",
		description: "Sync Real Time for Controller Box",
		callbackFunction: async (payload: Request): Promise<Response> => {
			const dateTime = new Date();
			const syncTimePayload: SyncTime = {
				protocolId: ProtocolId.PROTOCOL_ID_CMD_SYNC_TIME,
				time: {
					year: dateTime.getFullYear(),
					month: dateTime.getMonth() + 1,
					date: dateTime.getDate(),
					hour: dateTime.getHours(),
					minute: dateTime.getMinutes(),
					second: dateTime.getSeconds(),
				},
			};
			const result = await device.syncTime(syncTimePayload);
			return result;
		},
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_SYNC_TIME,
		},
	},
	{
		command: "get-real-time",
		description: "Get real time from Controller Box",
		callbackFunction: device.getRealTime.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_GET_REAL_TIME,
		},
	},
	{
		command: "reset-default-setting",
		description: "Reset default setting of Controller Box",
		callbackFunction: device.resetDefaultSetting.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_RESET_DEFAULT_SETTING,
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
					volume: 2000,
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
		command: "change-color-volume-all",
		description: "Change color volume for all pl from Controller Box",
		callbackFunction: async (payload) => {
			const response = await device.changeColorVolumeAll({
				protocolId: ProtocolId.PROTOCOL_ID_CMD_CHANGE_COLOR_VOLUME_ALL,
				volume: 0.01,
			});
			logger.info(
				`Change color volume got result ${JSON.stringify(response)}`
			);
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
		command: "get-expire-time",
		description: "Get expire time from Controller Box",
		callbackFunction: device.getExpireTime.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_GET_EXPIRE_TIME,
		},
	},
	{
		command: "set-expire-time",
		description: "Set expire time to Controller Box",
		callbackFunction: device.setExpireTime.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_SET_EXPIRE_TIME,
			expireTime: {
				year: 2025,
				month: 10,
				date: 14,
				hour: 20,
				minute: 13,
				second: 0,
			},
			key: generateRandomNumberArray(16),
			// usageTime: 10 * 24 * 60, // 10 days
		},
	},
	{
		command: "reverse-push-color",
		description: "Reverse push color from Controller Box",
		callbackFunction: device.pushColorWithDirection.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_PUSH_COLOR_COMMAND,
			command: PushColorCommandEnum.PUSH_COLOR_COMMAND_START,
			pipelineId: 1,
			direction: 1,
		},
	},
	{
		command: "push-color-fl-start",
		description: "Start push color flow",
		callbackFunction: device.pushColorFlowControl.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_PUSH_COLOR_FLOW_CONTROL,
			command: PushColorFlowCommand.PUSH_COLOR_FLOW_COMMAND_START,
			direction: 0,
		},
	},
	{
		command: "push-color-fl-stop",
		description: "Stop push color flow",
		callbackFunction: device.pushColorFlowControl.bind(device),
		payload: {
			protocolId: ProtocolId.PROTOCOL_ID_CMD_PUSH_COLOR_FLOW_CONTROL,
			command: PushColorFlowCommand.PUSH_COLOR_FLOW_COMMAND_STOP,
			direction: 0,
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
		try {
			program.parse([process.argv[0], process.argv[1], command]);
		} catch (e) {
			logger.error(e);
		}
	}
	rl.question("Enter a command: ", handleInput);
};

device.start();
observable = device.getObservable();

// Start the input loop
rl.question("Enter a command: ", handleInput);
