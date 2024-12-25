import {
	ChangeColorVolume,
	ChangeColorVolumeResult,
	ControlDoor,
	ControlDoorResult,
	GetSetting,
	GetSettingResult,
	GetExpireTime,
	GetExpireTimeResult,
	MixColor,
	MixColorResult,
	Ping,
	PingResult,
	PushColor,
	PushColorResult,
	RequestVersion,
	RequestVersionResult,
	Response,
	SetExpireTime,
	SetExpireTimeResult,
	UpdateSerialNumber,
	UpdateSerialNumberResult,
	UpdateSetting,
	UpdateSettingResult,
	SyncTime,
	SyncTimeResult,
	GetRealTimeResult,
	GetRealTime,
	ResetDefaultSettingResult,
	ResetDefaultSetting,
	PushColorWithDirection,
	PushColorWithDirectionResult,
} from "./interface";
import { Observable } from "rxjs";

export interface DeviceInterface {
	start(): Promise<void>;
	requestVersion(payload: RequestVersion): Promise<RequestVersionResult>;
	getSetting(payload: GetSetting): Promise<GetSettingResult>;
	updateSetting(payload: UpdateSetting): Promise<UpdateSettingResult>;
	ping(payload: Ping): Promise<PingResult>;
	updateSerialNumber(
		payload: UpdateSerialNumber
	): Promise<UpdateSerialNumberResult>;
	syncTime(payload: SyncTime): Promise<SyncTimeResult>;
	getRealTime(payload: GetRealTime): Promise<GetRealTimeResult>;
	resetDefaultSetting(
		payload: ResetDefaultSetting
	): Promise<ResetDefaultSettingResult>;
	changeColorVolume(
		payload: ChangeColorVolume
	): Promise<ChangeColorVolumeResult>;
	pushColor(payload: PushColor): Promise<PushColorResult>;
	pushColorWithDirection(
		payload: PushColorWithDirection
	): Promise<PushColorWithDirectionResult>;
	mixColor(payload: MixColor): Promise<MixColorResult>;
	controlDoor(payload: ControlDoor): Promise<ControlDoorResult>;
	setExpireTime(payload: SetExpireTime): Promise<SetExpireTimeResult>;
	getExpireTime(payload: GetExpireTime): Promise<GetExpireTimeResult>;
	getObservable(): Observable<Response>;
}
