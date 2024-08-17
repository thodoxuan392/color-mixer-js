import { filter, firstValueFrom, Observable, Subject } from "rxjs";
import { DeviceInterface } from "./device.interface";
import {
	BaseInterface,
	BaseResultInterface,
	ChangeColorVolume,
	ChangeColorVolumeResult,
	ControlDoor,
	ControlDoorResult,
	DeviceErrStatus,
	GetSetting,
	GetSettingResult,
	GetUsageTime,
	GetUsageTimeResult,
	InputSts,
	MachineStatus,
	MixColor,
	MixColorResult,
	Ping,
	PingResult,
	PipelineSetting,
	ProtocolId,
	PushColor,
	PushColorResult,
	RequestVersion,
	RequestVersionResult,
	Response,
	SetUsageTime,
	SetUsageTimeResult,
	START_BYTE,
	STOP_BYTE,
	UpdateSetting,
	UpdateSettingResult,
} from "./interface";
import { SerialPort } from "serialport";
import {
	calculateChecksum,
	calculateChecksumFromBuffer,
	floatToByteArray,
	isValidProtocolId,
} from "./utils";
import { Logger } from "./logger";

export enum USB_PRODUCT_ID {
	FT232 = "6001",
	SERIAL = "7523",
}

export class Device implements DeviceInterface {
	private _timerToCheckDevicePort: NodeJS.Timer;
	private _subject = new Subject<Response>();
	private _logger = Logger.getLogger();
	private _usbProductId = USB_PRODUCT_ID.SERIAL;
	private _port: SerialPort;
	private _buffer = Buffer.from([]);
	private _CHECK_DEVICE_PORT_INTERVAL = 1000;
	private _BAUDRATE_DEFAULT = 9600;
	private _RX_BUFFER_MAX_SIZE = 128;
	public async start(): Promise<void> {
		this._timerToCheckDevicePort = setInterval(async () => {
			if (this._port?.isOpen) {
				this.ping({
					protocolId: ProtocolId.PROTOCOL_ID_CMD_PING,
				});
				return;
			}
			// Get port
			const ports = await SerialPort.list();
			console.log(`Device opened ${JSON.stringify(ports)}`);
			const foundPort = ports.find(
				(port) => port.productId === this._usbProductId
			);
			if (!foundPort) {
				return;
			}
			const { path } = foundPort;
			this._port = new SerialPort({
				path,
				baudRate: this._BAUDRATE_DEFAULT,
			});
			this._port.on("open", () => {
				console.log(`Port opened ${path}`);
			});
			this._port.on("readable", () => {
				this._buffer = Buffer.concat([this._buffer, this._port.read()]);
				// this._logger.info(this._buffer);
				while (this._buffer.length > 0) {
					const { success, cutLen } =
						this._handleReadBufferFromDevice(this._buffer);
					// this._buffer = Buffer.from([]);
					if (!success) {
						// Handle read buffer from device failed -> Check buffer is too big
						if (this._buffer.length > this._RX_BUFFER_MAX_SIZE) {
							console.log("Buffer is too big, cleaning up ...");
							this._buffer = Buffer.from([]);
						}
						break;
					} else {
						this._buffer = this._buffer.slice(
							cutLen,
							this._buffer.length
						);
					}
				}
			});
		}, this._CHECK_DEVICE_PORT_INTERVAL);
	}

	public async requestVersion(
		payload: RequestVersion
	): Promise<RequestVersionResult> {
		const data = [];
		data.push(START_BYTE);
		data.push(payload.protocolId);
		data.push(0);
		const checksum = calculateChecksum(data.slice(3, data.length));
		data.push(checksum >> 8);
		data.push(checksum & 0xff);
		data.push(STOP_BYTE);
		// 		this._logger.info(data);
		if (this._port?.open) {
			this._port.write(Buffer.from(data));
		}
		return (await firstValueFrom(
			this._subject.pipe(
				filter(
					(response) =>
						response.protocolId ===
						ProtocolId.PROTOCOL_ID_CMD_REQUEST_VERSION
				)
			)
		)) as RequestVersionResult;
	}

	public async getSetting(payload: GetSetting): Promise<GetSettingResult> {
		const data = [];
		data.push(START_BYTE);
		data.push(payload.protocolId);
		data.push(0);
		const checksum = calculateChecksum(data.slice(3, data.length));
		data.push(checksum >> 8);
		data.push(checksum & 0xff);
		data.push(STOP_BYTE);
		this._logger.info(data);
		if (this._port?.open) {
			this._port.write(Buffer.from(data));
		}
		return (await firstValueFrom(
			this._subject.pipe(
				filter(
					(response) =>
						response.protocolId ===
						ProtocolId.PROTOCOL_ID_CMD_GET_SETTING
				)
			)
		)) as GetSettingResult;
	}

	public async updateSetting(
		payload: UpdateSetting
	): Promise<UpdateSettingResult> {
		const data = [];
		data.push(START_BYTE);
		data.push(payload.protocolId);
		data.push(16 * 7 + 10);
		for (let index = 0; index < 16; index++) {
			data.push(payload.pipeLineSettings[index].pulCoefficient);
			data.push(payload.pipeLineSettings[index].pulPer1ms >> 8);
			data.push(payload.pipeLineSettings[index].pulPer1ms & 0xff);
			data.push(payload.pipeLineSettings[index].pulPer01ms >> 8);
			data.push(payload.pipeLineSettings[index].pulPer01ms & 0xff);
			data.push(payload.pipeLineSettings[index].pulPer001ms >> 8);
			data.push(payload.pipeLineSettings[index].pulPer001ms & 0xff);
		}
		data.push(payload.closeDoorAngle);
		data.push(payload.openDoorAngle);
		data.push(payload.tOnForPushColor >> 8);
		data.push(payload.tOnForPushColor & 0xff);
		data.push(payload.tOnForMixColor >> 8);
		data.push(payload.tOnForMixColor & 0xff);
		data.push(payload.mixerSpeedLowLevel);
		data.push(payload.mixerSpeedMediumLevel);
		data.push(payload.mixerSpeedHighLevel);
		data.push(payload.mixerSpeedCurrLevel);

		const checksum = calculateChecksum(data.slice(3, data.length));
		data.push(checksum >> 8);
		data.push(checksum & 0xff);
		data.push(STOP_BYTE);
		// 		this._logger.info(data);
		if (this._port?.open) {
			this._port.write(Buffer.from(data));
		}
		return (await firstValueFrom(
			this._subject.pipe(
				filter(
					(response) =>
						response.protocolId ===
						ProtocolId.PROTOCOL_ID_CMD_UPDATE_SETTING
				)
			)
		)) as UpdateSettingResult;
	}

	public async ping(payload: Ping): Promise<PingResult> {
		const data = [];
		data.push(START_BYTE);
		data.push(payload.protocolId);
		data.push(0);
		const checksum = calculateChecksum(data.slice(3, data.length));
		data.push(checksum >> 8);
		data.push(checksum & 0xff);
		data.push(STOP_BYTE);
		// 		this._logger.info(data);
		if (this._port?.open) {
			this._port.write(Buffer.from(data));
		}
		return (await firstValueFrom(
			this._subject.pipe(
				filter(
					(response) =>
						response.protocolId === ProtocolId.PROTOCOL_ID_CMD_PING
				)
			)
		)) as PingResult;
	}

	public async changeColorVolume(
		payload: ChangeColorVolume
	): Promise<UpdateSettingResult> {
		const data = [];
		data.push(START_BYTE);
		data.push(payload.protocolId);
		data.push(5);
		data.push(payload.pipeLineId);
		const volumeByteArr = floatToByteArray(payload.volume);
		data.push(volumeByteArr.at(0));
		data.push(volumeByteArr.at(1));
		data.push(volumeByteArr.at(2));
		data.push(volumeByteArr.at(3));
		const checksum = calculateChecksum(data.slice(3, data.length));
		data.push(checksum >> 8);
		data.push(checksum & 0xff);
		data.push(STOP_BYTE);
		// 		this._logger.info(data);
		if (this._port?.open) {
			this._port.write(Buffer.from(data));
		}
		return (await firstValueFrom(
			this._subject.pipe(
				filter(
					(response) =>
						response.protocolId ===
						ProtocolId.PROTOCOL_ID_CMD_CHANGE_COLOR_VOLUME
				)
			)
		)) as ChangeColorVolumeResult;
	}

	public async pushColor(payload: PushColor): Promise<PushColorResult> {
		const data = [];
		data.push(START_BYTE);
		data.push(payload.protocolId);
		data.push(1);
		data.push(payload.command);
		const checksum = calculateChecksum(data.slice(3, data.length));
		data.push(checksum >> 8);
		data.push(checksum & 0xff);
		data.push(STOP_BYTE);
		// 		this._logger.info(data);
		if (this._port?.open) {
			this._port.write(Buffer.from(data));
		}
		return (await firstValueFrom(
			this._subject.pipe(
				filter(
					(response) =>
						response.protocolId ===
						ProtocolId.PROTOCOL_ID_CMD_PUSH_COLOR_COMMAND
				)
			)
		)) as PushColorResult;
	}

	public async mixColor(payload: MixColor): Promise<MixColorResult> {
		const data = [];
		data.push(START_BYTE);
		data.push(payload.protocolId);
		data.push(1);
		data.push(payload.command);
		const checksum = calculateChecksum(data.slice(3, data.length));
		data.push(checksum >> 8);
		data.push(checksum & 0xff);
		data.push(STOP_BYTE);
		// 		this._logger.info(data);
		if (this._port?.open) {
			this._port.write(Buffer.from(data));
		}
		return (await firstValueFrom(
			this._subject.pipe(
				filter(
					(response) =>
						response.protocolId ===
						ProtocolId.PROTOCOL_ID_CMD_MIX_COLOR_COMMAND
				)
			)
		)) as MixColorResult;
	}

	public async controlDoor(payload: ControlDoor): Promise<ControlDoorResult> {
		const data = [];
		data.push(START_BYTE);
		data.push(payload.protocolId);
		data.push(1);
		data.push(payload.command);
		const checksum = calculateChecksum(data.slice(3, data.length));
		data.push(checksum >> 8);
		data.push(checksum & 0xff);
		data.push(STOP_BYTE);
		// 		this._logger.info(data);
		if (this._port?.open) {
			this._port.write(Buffer.from(data));
		}
		return (await firstValueFrom(
			this._subject.pipe(
				filter(
					(response) =>
						response.protocolId ===
						ProtocolId.PROTOCOL_ID_CMD_DOOR_CONTROL
				)
			)
		)) as ControlDoorResult;
	}

	public async setUsageTime(
		payload: SetUsageTime
	): Promise<SetUsageTimeResult> {
		const data = [];
		data.push(START_BYTE);
		data.push(payload.protocolId);
		data.push(4);
		data.push((payload.usageTime >> 24) & 0xff);
		data.push((payload.usageTime >> 16) & 0xff);
		data.push((payload.usageTime >> 8) & 0xff);
		data.push(payload.usageTime & 0xff);

		const checksum = calculateChecksum(data.slice(3, data.length));
		data.push(checksum >> 8);
		data.push(checksum & 0xff);
		data.push(STOP_BYTE);
		// 		this._logger.info(data);
		if (this._port?.open) {
			this._port.write(Buffer.from(data));
		}
		return (await firstValueFrom(
			this._subject.pipe(
				filter(
					(response) =>
						response.protocolId ===
						ProtocolId.PROTOCOL_ID_CMD_SET_USAGE_TIME
				)
			)
		)) as SetUsageTimeResult;
	}

	public async getUsageTime(
		payload: GetUsageTime
	): Promise<GetUsageTimeResult> {
		const data = [];
		data.push(START_BYTE);
		data.push(payload.protocolId);
		data.push(0);
		const checksum = calculateChecksum(data.slice(3, data.length));
		data.push(checksum >> 8);
		data.push(checksum & 0xff);
		data.push(STOP_BYTE);
		// 		this._logger.info(data);
		if (this._port?.open) {
			this._port.write(Buffer.from(data));
		}
		return (await firstValueFrom(
			this._subject.pipe(
				filter(
					(response) =>
						response.protocolId ===
						ProtocolId.PROTOCOL_ID_CMD_GET_USAGE_TIME
				)
			)
		)) as GetUsageTimeResult;
	}

	getObservable(): Observable<Response> {
		return this._subject.pipe();
	}

	private _handleReadBufferFromDevice(buffer: Buffer): {
		success: boolean;
		cutLen: number;
	} {
		let cutLen = 0;
		let startByteIndex = 0;
		let foundStartByte = false;
		for (let index = 0; index < buffer.length; index++) {
			if (buffer[index] == START_BYTE) {
				startByteIndex = index;
				foundStartByte = true;
				break;
			}
		}
		if (!foundStartByte) {
			return { success: false, cutLen: 0 };
		}

		const startByte = buffer.at(startByteIndex);
		if (startByte !== START_BYTE) {
			this._logger.error(
				`Start byte ${startByte} is not valid, expected ${START_BYTE}`
			);
			return { success: false, cutLen: 0 };
		}

		const protocolId = buffer.at(startByteIndex + 1);
		if (!isValidProtocolId(protocolId)) {
			this._logger.error(`Protocol Id ${protocolId} is not valid`);
			return { success: false, cutLen: 0 };
		}

		const data_len = buffer.at(startByteIndex + 2);

		if (buffer.length < startByteIndex + data_len + 2) {
			return { success: false, cutLen: 0 };
		}

		const checksum =
			(buffer.at(startByteIndex + 3 + data_len) << 8) |
			buffer.at(startByteIndex + 4 + data_len);
		const expectedChecksum = calculateChecksumFromBuffer(
			buffer.slice(startByteIndex + 3, startByteIndex + 3 + data_len)
		);
		if (checksum != expectedChecksum) {
			this._logger.error(
				`Check sum is not valid ${checksum} is not valid, expected ${expectedChecksum}`
			);
			return { success: false, cutLen: 0 };
		}

		if (buffer.length < startByteIndex + data_len + 6) {
			return { success: false, cutLen: 0 };
		}

		const stopByte = buffer.at(startByteIndex + 5 + data_len);
		if (stopByte !== STOP_BYTE) {
			this._logger.error(
				`Stop byte ${stopByte} is not valid, expected ${STOP_BYTE}`
			);
			return { success: false, cutLen: 0 };
		}

		switch (protocolId) {
			case ProtocolId.PROTOCOL_ID_CMD_UPDATE_SETTING:
			case ProtocolId.PROTOCOL_ID_CMD_CHANGE_COLOR_VOLUME:
			case ProtocolId.PROTOCOL_ID_CMD_DOOR_CONTROL:
			case ProtocolId.PROTOCOL_ID_CMD_SET_USAGE_TIME:
			case ProtocolId.PROTOCOL_ID_CMD_PING: {
				const result = buffer.at(3);
				const response: BaseResultInterface = {
					protocolId,
					result,
				};
				cutLen = 4 + 3; // 1 for checksum , 1 for stop byte
				this.sendBack(response);
				break;
			}
			case ProtocolId.PROTOCOL_ID_CMD_REQUEST_VERSION: {
				const result = buffer.at(3);
				const serialNumber = buffer.subarray(4, 10).toString("ascii");
				const firmwareVersion = `${buffer.at(10)}.${buffer.at(
					11
				)}.${buffer.at(12)}`;
				const boardVersion = `${buffer.at(13)}.${buffer.at(
					14
				)}.${buffer.at(15)}`;
				const boardType = (buffer.at(16) << 8) | buffer.at(17);
				const requestVersionResult: RequestVersionResult = {
					protocolId,
					result,
					serialNumber,
					firmwareVersion,
					boardVersion,
					boardType,
				};
				cutLen = 18 + 3; // 2 for checksum , 1 for stop byte
				this.sendBack(requestVersionResult);
				break;
			}
			case ProtocolId.PROTOCOL_ID_CMD_GET_SETTING: {
				const result = buffer.at(3);
				let pipeLineSettings = new Array<PipelineSetting>();
				for (let index = 0; index < 16; index++) {
					const pulCoefficient = buffer[4 + index * 7];
					const pulPer1ms =
						(buffer.at(4 + index * 7 + 1) << 8) |
						buffer.at(4 + index * 7 + 2);
					const pulPer01ms =
						(buffer.at(4 + index * 7 + 3) << 8) |
						buffer.at(4 + index * 7 + 4);
					const pulPer001ms =
						(buffer.at(4 + index * 7 + 5) << 8) |
						buffer.at(4 + index * 7 + 6);
					pipeLineSettings.push({
						pulCoefficient,
						pulPer1ms,
						pulPer01ms,
						pulPer001ms,
					});
				}
				const closeDoorAngle = buffer.at(4 + 16 * 7);
				const openDoorAngle = buffer.at(4 + 16 * 7 + 1);
				const tOnForPushColor =
					(buffer.at(4 + 16 * 7 + 2) << 8) |
					buffer.at(4 + 16 * 7 + 3);
				const tOnForMixColor =
					(buffer.at(4 + 16 * 7 + 4) << 8) |
					buffer.at(4 + 16 * 7 + 5);
				const mixerSpeedLowLevel = buffer.at(4 + 16 * 7 + 6);
				const mixerSpeedMediumLevel = buffer.at(4 + 16 * 7 + 7);
				const mixerSpeedHighLevel = buffer.at(4 + 16 * 7 + 8);
				const mixerSpeedCurrLevel = buffer.at(4 + 16 * 7 + 9);

				const getSettingResult: GetSettingResult = {
					protocolId,
					result,
					pipeLineSettings,
					closeDoorAngle,
					openDoorAngle,
					tOnForPushColor,
					tOnForMixColor,
					mixerSpeedLowLevel,
					mixerSpeedMediumLevel,
					mixerSpeedHighLevel,
					mixerSpeedCurrLevel,
				};
				cutLen = 4 + 16 * 7 + 10 + 3; // 2 for checksum , 1 for stop byte
				this.sendBack(getSettingResult);
				break;
			}
			case ProtocolId.PROTOCOL_ID_CMD_PUSH_COLOR_COMMAND: {
				const result = buffer.at(3);
				const command = buffer.at(4);
				const pushColorResult: PushColorResult = {
					protocolId,
					result,
					command,
				};
				cutLen = 5 + 3; // 2 for checksum , 1 for stop byte
				this.sendBack(pushColorResult);
				break;
			}
			case ProtocolId.PROTOCOL_ID_CMD_MIX_COLOR_COMMAND: {
				const result = buffer.at(3);
				const command = buffer.at(4);
				const mixColorResult: MixColorResult = {
					protocolId,
					result,
					command,
				};
				cutLen = 5 + 3; // 2 for checksum , 1 for stop byte
				this.sendBack(mixColorResult);
				break;
			}
			case ProtocolId.PROTOCOL_ID_CMD_GET_USAGE_TIME: {
				const result = buffer.at(3);
				const usageTime =
					(buffer.at(4) << 24) |
					(buffer.at(5) << 16) |
					(buffer.at(6) << 8) |
					buffer.at(7);
				const usageTimeResult: GetUsageTimeResult = {
					protocolId,
					result,
					usageTime,
				};
				cutLen = 8 + 3; // 2 for checksum , 1 for stop byte
				this.sendBack(usageTimeResult);
				break;
			}
			case ProtocolId.PROTOCOL_ID_STS_DEVICE_ERR: {
				const deviceErr = (buffer.at(3) << 8) | buffer.at(4);
				const deviceErrorSts: DeviceErrStatus = {
					protocolId,
					eepromError: (deviceErr & 0x8000) != 0,
					pipelineError: [false],
				};
				cutLen = 5 + 3; // 2 for checksum , 1 for stop byte
				this.sendBack(deviceErrorSts);
				break;
			}
			case ProtocolId.PROTOCOL_ID_STS_LASER: {
				const sts = buffer.at(3);
				const inputSts: InputSts = {
					protocolId,
					doorClosed: (sts & 0x01) != 0,
					doorOpened: (sts & 0x02) != 0,
					canDetected: (sts & 0x04) != 0,
					reserved: (sts & 0x08) != 0,
				};
				cutLen = 4 + 3; // 2 for checksum , 1 for stop byte
				this.sendBack(inputSts);
				break;
			}
			case ProtocolId.PROTOCOL_ID_STS_MACHINE: {
				const sts = buffer.at(3);
				const machineStatus: MachineStatus = {
					protocolId,
					machineStatus: sts,
				};
				cutLen = 4 + 3; // 2 for checksum , 1 for stop byte
				this.sendBack(machineStatus);
				break;
			}
			default:
				break;
		}

		return { success: true, cutLen };
	}

	private sendBack(message: Response) {
		this._subject.next(message);
	}
}
