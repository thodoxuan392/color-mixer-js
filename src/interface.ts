export enum ProtocolId {
	// Generic Command
	PROTOCOL_ID_CMD_RESET = 0x01,
	PROTOCOL_ID_CMD_REQUEST_VERSION = 0x02,
	PROTOCOL_ID_CMD_GET_SETTING = 0x03,
	PROTOCOL_ID_CMD_UPDATE_SETTING = 0x04,
	PROTOCOL_ID_CMD_PING = 0x05,
	PROTOCOL_ID_CMD_UPDATE_SERIAL_NUMBER = 0x06,
	PROTOCOL_ID_CMD_SYNC_TIME = 0x07,
	PROTOCOL_ID_CMD_GET_REAL_TIME = 0x08,
	PROTOCOL_ID_CMD_RESET_DEFAULT_SETTING = 0x09,

	// Specific Function Command
	PROTOCOL_ID_CMD_CHANGE_COLOR_VOLUME = 0x10,
	PROTOCOL_ID_CMD_PUSH_COLOR_COMMAND = 0x11,
	PROTOCOL_ID_CMD_MIX_COLOR_COMMAND = 0x12,
	PROTOCOL_ID_CMD_CONTROL_IO = 0x13,
	PROTOCOL_ID_CMD_CALIBRATION = 0x14,
	PROTOCOL_ID_CMD_DOOR_CONTROL = 0x15,
	PROTOCOL_ID_CMD_SET_EXPIRE_TIME = 0x16,
	PROTOCOL_ID_CMD_GET_EXPIRE_TIME = 0x17,
	PROTOCOL_ID_CMD_PUSH_COLOR_COMMAND_W_DIRECTION = 0x19,
	PROTOCOL_ID_CMD_MAX,

	// Status
	PROTOCOL_ID_STS_DEVICE_ERR = 0x30,
	PROTOCOL_ID_STS_LASER = 0x31,
	PROTOCOL_ID_STS_MACHINE = 0x32,
	PROTOCOL_ID_STS_PIPELINE = 0x33,

	PROTOCOL_ID_MAX,
}

export enum Result {
	PROTOCOL_RESULT_SUCCESS = 0x00,
	PROTOCOL_RESULT_ERROR = 0x01,
	PROTOCOL_RESULT_COMM_PROTOCOL_ID_INVALID = 0x10,
	PROTOCOL_RESULT_COMM_PROTOCOL_CRC_INVALID = 0x11,
	PROTOCOL_RESULT_COMM_PROTOCOL_START_STOP_BYTE_INVALID = 0x12,
	PROTOCOL_RESULT_COMM_PROTOCOL_DATA_LEN_INVALID = 0x13,
	PROTOCOL_RESULT_COMM_PROTOCOL_TIMEOUT = 0x14,
	PROTOCOL_RESULT_CMD_RESET_TIMEOUT = 0x20,
	PROTOCOL_RESULT_CMD_TRANSFER_OTA_DATA_IN_PROGRESS = 0x21,

	PROTOCOL_RESULT_CMD_SETTING_INVALID = 0x30,
	PROTOCOL_RESULT_CMD_DEVICE_LOCKED = 0x31,
}

export type BaseInterface = {
	protocolId: ProtocolId;
};

export type BaseResultInterface = BaseInterface & {
	result: Result;
};
export type RequestVersion = BaseInterface;
export type RequestVersionResult = BaseResultInterface & {
	serialNumber: string;
	firmwareVersion: string;
	boardVersion: string;
	boardType: number;
};

export type PipelineSetting = {
	pulCoefficient: number;
	pulPer1ms: number;
	pulPer01ms: number;
	pulPer001ms: number;
	tOnForPushColor: number;
};

export type Setting = {
	pipeLineSettings: PipelineSetting[];
	closeDoorAngle: number;
	openDoorAngle: number;
	tOnForMixColor: number;
	mixerSpeedLowLevel: number;
	mixerSpeedMediumLevel: number;
	mixerSpeedHighLevel: number;
	mixerSpeedCurrLevel: number;
};
export type GetSetting = BaseInterface;
export type GetSettingResult = BaseResultInterface & Setting;

export type UpdateSetting = BaseInterface & Setting;
export type UpdateSettingResult = BaseResultInterface;

export type Ping = BaseInterface;
export type PingResult = BaseResultInterface;

export type UpdateSerialNumber = BaseInterface & {
	serialNumber: number[];
};
export type UpdateSerialNumberResult = BaseResultInterface;

export type SyncTime = BaseInterface & {
	time: CustomDateTime;
};
export type SyncTimeResult = BaseResultInterface;

export type GetRealTime = BaseInterface;
export type GetRealTimeResult = BaseResultInterface & {
	time: CustomDateTime;
};

export type ResetDefaultSetting = BaseInterface;
export type ResetDefaultSettingResult = BaseResultInterface;

export type ChangeColorVolume = BaseInterface & {
	pipeLineId: number;
	volume: number;
};
export type ChangeColorVolumeResult = BaseResultInterface;

export enum PushColorCommandEnum {
	PUSH_COLOR_COMMAND_START = 0x00,
	PUSH_COLOR_COMMAND_STOP = 0x01,
	PUSH_COLOR_COMMAND_PAUSE = 0x02,
	PUSH_COLOR_COMMAND_RESUME = 0x03,
}

export type PushColor = BaseInterface & {
	command: PushColorCommandEnum;
};
export type PushColorResult = BaseResultInterface & {
	command: PushColorCommandEnum;
};

export type PushColorWithDirection = BaseInterface & {
	command: PushColorCommandEnum;
	pipelineId: number;
	direction: number;
};
export type PushColorWithDirectionResult = BaseResultInterface & {
	command: PushColorCommandEnum;
};

export enum MixColorCommandEnum {
	MIX_COLOR_COMMAND_START = 0x00,
	MIX_COLOR_COMMAND_STOP = 0x01,
	MIX_COLOR_COMMAND_PAUSE = 0x02,
	MIX_COLOR_COMMAND_RESUME = 0x03,
}
export type MixColor = BaseInterface & {
	command: MixColorCommandEnum;
};
export type MixColorResult = BaseResultInterface & {
	command: MixColorCommandEnum;
};

export type ControlIO = BaseInterface & {
	selectedMask: number;
	levelMask: number;
};

export enum ControlDoorCommandEnum {
	CONTROL_DOOR_COMMAND_CLOSE = 0,
	CONTROL_DOOR_COMMAND_OPEN = 1,
}
export type ControlDoor = BaseInterface & {
	command: ControlDoorCommandEnum;
};
export type ControlDoorResult = BaseResultInterface;

export type SetExpireTime = BaseInterface & {
	key: number[];
	expireTime: CustomDateTime;
};
export type SetExpireTimeResult = BaseResultInterface;

export type GetExpireTime = BaseInterface;
export type GetExpireTimeResult = BaseResultInterface & {
	expireTime: CustomDateTime;
};

export type DeviceErrStatus = BaseInterface & {
	pipelineError: boolean[];
	eepromError: boolean;
};
export type InputSts = BaseInterface & {
	doorClosed: boolean;
	doorOpened: boolean;
	canDetected: boolean;
	reserved: boolean;
};

export enum MachineStatusEnum {
	MACHINE_STATUS_NORMAL = 0x00,
	MACHINE_STATUS_ERROR = 0x01,
	MACHINE_STATUS_LOCKED = 0x02,
}
export type MachineStatus = BaseInterface & {
	machineStatus: MachineStatusEnum;
};

export type PipelineStatus = BaseInterface & {
	pipelineId: number;
	remainVolume: number;
};

export type CustomDateTime = {
	year: number;
	month: number;
	date: number;
	hour: number;
	minute: number;
	second: number;
};

export const START_BYTE = 0x78;
export const STOP_BYTE = 0x79;

export type Request =
	| RequestVersion
	| GetSetting
	| UpdateSetting
	| Ping
	| UpdateSerialNumber
	| SyncTime
	| GetRealTime
	| ChangeColorVolume
	| PushColor
	| MixColor
	| ControlDoor
	| SetExpireTime
	| GetExpireTime
	| PushColorWithDirection;

export type Response =
	| RequestVersionResult
	| GetSettingResult
	| UpdateSettingResult
	| PingResult
	| UpdateSerialNumberResult
	| SyncTimeResult
	| GetRealTimeResult
	| ChangeColorVolumeResult
	| PushColorResult
	| MixColorResult
	| ControlDoorResult
	| SetExpireTimeResult
	| GetExpireTimeResult
	| PushColorWithDirectionResult
	| DeviceErrStatus
	| InputSts
	| MachineStatus
	| PipelineStatus;
