import {PlatformConfig} from "homebridge/lib/bridgeService";
import {ZoneDevice} from "./plaforms/platform";

export interface ZoneConfig {
    name: string;
    devices: ZoneDevice[];
    interval: number;
    changesForTrigger: number;
}

export interface ZonesConfig extends PlatformConfig {
    zones: ZoneConfig[];
}