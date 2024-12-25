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
	GetExpireTime,
	GetExpireTimeResult,
	InputSts,
	MachineStatus,
	MixColor,
	MixColorResult,
	Ping,
	PingResult,
	PipelineSetting,
	PipelineStatus,
	ProtocolId,
	PushColor,
	PushColorResult,
	RequestVersion,
	RequestVersionResult,
	Response,
	SetExpireTime,
	SetExpireTimeResult,
	START_BYTE,
	STOP_BYTE,
	UpdateSetting,
	UpdateSettingResult,
	UpdateSerialNumber,
	UpdateSerialNumberResult,
	SyncTime,
	SyncTimeResult,
	GetRealTime,
	GetRealTimeResult,
	ResetDefaultSetting,
	ResetDefaultSettingResult,
	PushColorWithDirection,
	PushColorWithDirectionResult,
} from "./interface";
import { SerialPort } from "serialport";
import {
	byteArrayToFloat,
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
	private _RX_BUFFER_MAX_SIZE = 1024;
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
		data.push(16 * 9 + 8);
		for (let index = 0; index < 16; index++) {
			data.push(payload.pipeLineSettings[index].pulCoefficient);
			data.push(payload.pipeLineSettings[index].pulPer1ms >> 8);
			data.push(payload.pipeLineSettings[index].pulPer1ms & 0xff);
			data.push(payload.pipeLineSettings[index].pulPer01ms >> 8);
			data.push(payload.pipeLineSettings[index].pulPer01ms & 0xff);
			data.push(payload.pipeLineSettings[index].pulPer001ms >> 8);
			data.push(payload.pipeLineSettings[index].pulPer001ms & 0xff);
			data.push(payload.pipeLineSettings[index].tOnForPushColor >> 8);
			data.push(payload.pipeLineSettings[index].tOnForPushColor & 0xff);
		}
		data.push(payload.closeDoorAngle);
		data.push(payload.openDoorAngle);
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
	public async updateSerialNumber(
		payload: UpdateSerialNumber
	): Promise<UpdateSerialNumberResult> {
		const data = [];
		data.push(START_BYTE);
		data.push(payload.protocolId);
		data.push(6);

		data.push(payload.serialNumber[0]);
		data.push(payload.serialNumber[1]);
		data.push(payload.serialNumber[2]);
		data.push(payload.serialNumber[3]);
		data.push(payload.serialNumber[4]);
		data.push(payload.serialNumber[5]);

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
						ProtocolId.PROTOCOL_ID_CMD_UPDATE_SERIAL_NUMBER
				)
			)
		)) as PingResult;
	}
	public async syncTime(payload: SyncTime): Promise<SyncTimeResult> {
		const data = [];
		data.push(START_BYTE);
		data.push(payload.protocolId);
		data.push(7);

		data.push((payload.time.year >> 8) & 0xff);
		data.push(payload.time.year & 0xff);
		data.push(payload.time.month & 0xff);
		data.push(payload.time.date & 0xff);
		data.push(payload.time.hour & 0xff);
		data.push(payload.time.minute & 0xff);
		data.push(payload.time.second & 0xff);

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
						ProtocolId.PROTOCOL_ID_CMD_SYNC_TIME
				)
			)
		)) as SyncTimeResult;
	}

	public async getRealTime(payload: GetRealTime): Promise<GetRealTimeResult> {
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
						ProtocolId.PROTOCOL_ID_CMD_GET_REAL_TIME
				)
			)
		)) as GetRealTimeResult;
	}

	public async resetDefaultSetting(
		payload: ResetDefaultSetting
	): Promise<ResetDefaultSettingResult> {
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
						ProtocolId.PROTOCOL_ID_CMD_RESET_DEFAULT_SETTING
				)
			)
		)) as ResetDefaultSettingResult;
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

	public async setExpireTime(
		payload: SetExpireTime
	): Promise<SetExpireTimeResult> {
		const data = [];
		data.push(START_BYTE);
		data.push(payload.protocolId);
		data.push(23);
		if (payload.key.length != 16) {
			this._logger.error(
				`Invalid key length ${payload.key.length}, expect 16`
			);
			return null;
		}
		for (let index = 0; index < 16; index++) {
			data.push(payload.key.at(index) & 0xff);
		}
		data.push((payload.expireTime.year >> 8) & 0xff);
		data.push(payload.expireTime.year & 0xff);
		data.push(payload.expireTime.month & 0xff);
		data.push(payload.expireTime.date & 0xff);
		data.push(payload.expireTime.hour & 0xff);
		data.push(payload.expireTime.minute & 0xff);
		data.push(payload.expireTime.second & 0xff);

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
						ProtocolId.PROTOCOL_ID_CMD_SET_EXPIRE_TIME
				)
			)
		)) as SetExpireTimeResult;
	}

	public async getExpireTime(
		payload: GetExpireTime
	): Promise<GetExpireTimeResult> {
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
						ProtocolId.PROTOCOL_ID_CMD_GET_EXPIRE_TIME
				)
			)
		)) as GetExpireTimeResult;
	}

	public async pushColorWithDirection(
		payload: PushColorWithDirection
	): Promise<PushColorWithDirectionResult> {
		const data = [];
		data.push(START_BYTE);
		data.push(payload.protocolId);
		data.push(3);
		data.push(payload.command);
		data.push(payload.pipelineId);
		data.push(payload.direction);
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
						ProtocolId.PROTOCOL_ID_CMD_PUSH_COLOR_COMMAND_W_DIRECTION
				)
			)
		)) as PushColorWithDirectionResult;
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
			case ProtocolId.PROTOCOL_ID_CMD_SET_EXPIRE_TIME:
			case ProtocolId.PROTOCOL_ID_CMD_PING:
			case ProtocolId.PROTOCOL_ID_CMD_UPDATE_SERIAL_NUMBER:
			case ProtocolId.PROTOCOL_ID_CMD_RESET_DEFAULT_SETTING:
			case ProtocolId.PROTOCOL_ID_CMD_SYNC_TIME: {
				const result = buffer.at(startByteIndex + 3);
				const response: BaseResultInterface = {
					protocolId,
					result,
				};
				cutLen = 4 + 3; // 1 for checksum , 1 for stop byte
				this.sendBack(response);
				break;
			}
			case ProtocolId.PROTOCOL_ID_CMD_GET_REAL_TIME: {
				const result = buffer.at(startByteIndex + 3);
				const year =
					(buffer.at(startByteIndex + 4) << 8) |
					buffer.at(startByteIndex + 5);
				const month = buffer.at(startByteIndex + 6);
				const date = buffer.at(startByteIndex + 7);
				const hour = buffer.at(startByteIndex + 8);
				const minute = buffer.at(startByteIndex + 9);
				const second = buffer.at(startByteIndex + 10);
				const realTimeResult: GetRealTimeResult = {
					protocolId,
					result,
					time: {
						year,
						month,
						date,
						hour,
						minute,
						second,
					},
				};
				cutLen = 11 + 3; // 2 for checksum , 1 for stop byte
				this.sendBack(realTimeResult);
				break;
			}
			case ProtocolId.PROTOCOL_ID_CMD_REQUEST_VERSION: {
				const result = buffer.at(startByteIndex + 3);
				const serialNumber = buffer
					.subarray(startByteIndex + 4, startByteIndex + 10)
					.toString("ascii");
				const firmwareVersion = `${buffer.at(
					startByteIndex + 10
				)}.${buffer.at(startByteIndex + 11)}.${buffer.at(
					startByteIndex + 12
				)}`;
				const boardVersion = `${buffer.at(
					startByteIndex + 13
				)}.${buffer.at(startByteIndex + 14)}.${buffer.at(
					startByteIndex + 15
				)}`;
				const boardType =
					(buffer.at(startByteIndex + 16) << 8) |
					buffer.at(startByteIndex + 17);
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
				const result = buffer.at(startByteIndex + 3);
				let pipeLineSettings = new Array<PipelineSetting>();
				for (let index = 0; index < 16; index++) {
					const pulCoefficient =
						buffer[startByteIndex + 4 + index * 9];
					const pulPer1ms =
						(buffer.at(startByteIndex + 4 + index * 9 + 1) << 8) |
						buffer.at(startByteIndex + 4 + index * 9 + 2);
					const pulPer01ms =
						(buffer.at(startByteIndex + 4 + index * 9 + 3) << 8) |
						buffer.at(startByteIndex + 4 + index * 9 + 4);
					const pulPer001ms =
						(buffer.at(startByteIndex + 4 + index * 9 + 5) << 8) |
						buffer.at(startByteIndex + 4 + index * 9 + 6);
					const tOnForPushColor =
						(buffer.at(startByteIndex + 4 + index * 9 + 7) << 8) |
						buffer.at(startByteIndex + 4 + index * 9 + 8);
					pipeLineSettings.push({
						pulCoefficient,
						pulPer1ms,
						pulPer01ms,
						pulPer001ms,
						tOnForPushColor,
					});
				}
				const closeDoorAngle = buffer.at(startByteIndex + 4 + 16 * 9);
				const openDoorAngle = buffer.at(
					startByteIndex + 4 + 16 * 9 + 1
				);
				const tOnForMixColor =
					(buffer.at(startByteIndex + 4 + 16 * 9 + 2) << 8) |
					buffer.at(startByteIndex + 4 + 16 * 9 + 3);
				const mixerSpeedLowLevel = buffer.at(
					startByteIndex + 4 + 16 * 9 + 4
				);
				const mixerSpeedMediumLevel = buffer.at(
					startByteIndex + 4 + 16 * 9 + 5
				);
				const mixerSpeedHighLevel = buffer.at(
					startByteIndex + 4 + 16 * 9 + 6
				);
				const mixerSpeedCurrLevel = buffer.at(
					startByteIndex + 4 + 16 * 9 + 7
				);

				const getSettingResult: GetSettingResult = {
					protocolId,
					result,
					pipeLineSettings,
					closeDoorAngle,
					openDoorAngle,
					tOnForMixColor,
					mixerSpeedLowLevel,
					mixerSpeedMediumLevel,
					mixerSpeedHighLevel,
					mixerSpeedCurrLevel,
				};
				cutLen = 4 + 16 * 9 + 8 + 3; // 2 for checksum , 1 for stop byte
				this.sendBack(getSettingResult);
				break;
			}
			case ProtocolId.PROTOCOL_ID_CMD_PUSH_COLOR_COMMAND: {
				const result = buffer.at(startByteIndex + 3);
				const command = buffer.at(startByteIndex + 4);
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
				const result = buffer.at(startByteIndex + 3);
				const command = buffer.at(startByteIndex + 4);
				const mixColorResult: MixColorResult = {
					protocolId,
					result,
					command,
				};
				cutLen = 5 + 3; // 2 for checksum , 1 for stop byte
				this.sendBack(mixColorResult);
				break;
			}
			case ProtocolId.PROTOCOL_ID_CMD_GET_EXPIRE_TIME: {
				const result = buffer.at(startByteIndex + 3);
				const year =
					(buffer.at(startByteIndex + 4) << 8) |
					buffer.at(startByteIndex + 5);
				const month = buffer.at(startByteIndex + 6);
				const date = buffer.at(startByteIndex + 7);
				const hour = buffer.at(startByteIndex + 8);
				const minute = buffer.at(startByteIndex + 9);
				const second = buffer.at(startByteIndex + 10);
				const usageTimeResult: GetExpireTimeResult = {
					protocolId,
					result,
					expireTime: {
						year,
						month,
						date,
						hour,
						minute,
						second,
					},
				};
				cutLen = 11 + 3; // 2 for checksum , 1 for stop byte
				this.sendBack(usageTimeResult);
				break;
			}
			case ProtocolId.PROTOCOL_ID_STS_DEVICE_ERR: {
				const deviceErr =
					(buffer.at(startByteIndex + 3) << 8) |
					buffer.at(startByteIndex + 4);
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
				const sts = buffer.at(startByteIndex + 3);
				const inputSts: InputSts = {
					protocolId,
					doorOpened: (sts & 0x01) != 0,
					doorClosed: (sts & 0x02) != 0,
					canDetected: (sts & 0x04) != 0,
					reserved: (sts & 0x08) != 0,
				};
				cutLen = 4 + 3; // 2 for checksum , 1 for stop byte
				this.sendBack(inputSts);
				break;
			}
			case ProtocolId.PROTOCOL_ID_STS_MACHINE: {
				const sts = buffer.at(startByteIndex + 3);
				const machineStatus: MachineStatus = {
					protocolId,
					machineStatus: sts,
				};
				cutLen = 4 + 3; // 2 for checksum , 1 for stop byte
				this.sendBack(machineStatus);
				break;
			}
			case ProtocolId.PROTOCOL_ID_STS_PIPELINE: {
				const pipelineId = buffer.at(startByteIndex + 3);
				const remainVolumeByteArr = new Uint8Array([
					buffer.at(4),
					buffer.at(5),
					buffer.at(6),
					buffer.at(7),
				]);
				const remainVolume = byteArrayToFloat(remainVolumeByteArr);
				const pipelineStatus: PipelineStatus = {
					protocolId,
					pipelineId,
					remainVolume,
				};
				cutLen = 8 + 3; // 2 for checksum , 1 for stop byte
				this.sendBack(pipelineStatus);
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
