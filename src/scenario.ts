import { Device } from "./device";
import {
	ProtocolId,
	PushColorFlowCommand,
	Request,
	Response,
} from "./interface";
import { Logger } from "./logger";

const TEST_STOP_WHEN_EXCEPTION = true;

export enum TestScenario {
	TEST_SCENARIO_PUSH_COLOR_FLOW,
}

export type TestScenarioDescriptor = {
	name: string;
	actions: {
		functionExecute: (payload: Request) => Promise<Response>;
		payloadBuilder: () => Request;
		actionRepeatCount: number;
		postDelayMs: number;
		postFunc: () => void;
	}[];
	scenarioRepeatCount: number;
};

const logger = Logger.getLogger();
const device = new Device();
let pipelineId: number = 0;
let numberFunctionExe = 0;
let numberException = 0;

const TEST_SCENARIO_TABLE: Record<TestScenario, TestScenarioDescriptor> = {
	[TestScenario.TEST_SCENARIO_PUSH_COLOR_FLOW]: {
		name: "Push Color Flow Test",
		actions: [
			// Change color volume for all 16 pipeline
			{
				functionExecute: device.changeColorVolume.bind(device),
				payloadBuilder: () => {
					return {
						protocolId:
							ProtocolId.PROTOCOL_ID_CMD_CHANGE_COLOR_VOLUME,
						pipeLineId: pipelineId,
						volume: 10,
					};
				},
				actionRepeatCount: 16,
				postDelayMs: 1000,
				postFunc: () => {
					pipelineId = (pipelineId + 1) % 16;
				},
			},
			// Start Push Color Flow
			{
				functionExecute: device.pushColorFlowControl.bind(device),
				payloadBuilder: () => {
					return {
						protocolId:
							ProtocolId.PROTOCOL_ID_CMD_PUSH_COLOR_FLOW_CONTROL,
						command:
							PushColorFlowCommand.PUSH_COLOR_FLOW_COMMAND_START,
						direction: 0,
					};
				},
				actionRepeatCount: 1,
				postDelayMs: 0,
				postFunc: () => {},
			},
		],
		scenarioRepeatCount: 1,
	},
};

async function delayMs(ms: number): Promise<void> {
	return new Promise((resolve, reject) => {
		setTimeout(() => resolve(), ms);
	});
}

async function main() {
	for await (const [TestScenario, TestScenarioDescriptor] of Object.entries(
		TEST_SCENARIO_TABLE
	)) {
		logger.info(`Running scenario ${TestScenarioDescriptor.name}....`);
		for await (const action of TestScenarioDescriptor.actions) {
			for await (const no of Array.from(
				Array(action.actionRepeatCount).keys()
			)) {
				const payload = action.payloadBuilder();
				logger.info(
					`Executing function with payload ${JSON.stringify(
						payload
					)} ...`
				);
				try {
					const response = await action.functionExecute(payload);
					logger.info(
						`Execute function got response ${JSON.stringify(
							response
						)}`
					);
				} catch (err) {
					logger.error(`Execute function got error`, err);
					numberException++;
				} finally {
					await delayMs(action.postDelayMs);
					action.postFunc();
					numberFunctionExe++;
				}
			}
		}
		logger.info(`Scenario ${TestScenarioDescriptor.name} completed`);
	}

	logger.info(
		`Function report error ratio: ${
			(numberException / numberFunctionExe) * 100
		}%`
	);
}

main();
