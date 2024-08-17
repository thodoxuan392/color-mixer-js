import {
	ChangeColorVolume,
	ChangeColorVolumeResult,
	ControlDoor,
	ControlDoorResult,
	GetSetting,
	GetSettingResult,
	GetUsageTime,
	GetUsageTimeResult,
	MixColor,
	MixColorResult,
	Ping,
	PingResult,
	PushColor,
	PushColorResult,
	RequestVersion,
	RequestVersionResult,
	Response,
	SetUsageTime,
	SetUsageTimeResult,
	UpdateSetting,
	UpdateSettingResult,
} from "./interface";
import { Observable } from "rxjs";

export interface DeviceInterface {
	start(): Promise<void>;
	requestVersion(payload: RequestVersion): Promise<RequestVersionResult>;
	getSetting(payload: GetSetting): Promise<GetSettingResult>;
	updateSetting(payload: UpdateSetting): Promise<UpdateSettingResult>;
	ping(payload: Ping): Promise<PingResult>;
	changeColorVolume(
		payload: ChangeColorVolume
	): Promise<ChangeColorVolumeResult>;
	pushColor(payload: PushColor): Promise<PushColorResult>;
	mixColor(payload: MixColor): Promise<MixColorResult>;
	controlDoor(payload: ControlDoor): Promise<ControlDoorResult>;
	setUsageTime(payload: SetUsageTime): Promise<SetUsageTimeResult>;
	getUsageTime(payload: GetUsageTime): Promise<GetUsageTimeResult>;
	getObservable(): Observable<Response>;
}
