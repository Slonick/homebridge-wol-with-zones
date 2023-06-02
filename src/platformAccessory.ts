import {CharacteristicValue, Logger, PlatformAccessory, Service} from 'homebridge';

import {WOLZonePlatform} from './platform';
import {ZoneConfig} from "./platformConfig";
import {Platfotm, ZoneDevice} from "./plaforms/platform";
import {Windows} from "./plaforms/windows";
import {MacOS} from "./plaforms/macos";
import {setTimeoutAsync} from "./utilities";

export class WOLZoneAccessory {
    private changes: number = 0;
    private currentState: boolean = false;
    private suspendUpdate: boolean = false;

    private zone: ZoneConfig;
    private readonly devices: ZoneDevice[];
    private motionSensorSleepService: Service;
    private motionSensorWakeService: Service;

    constructor(
        public readonly log: Logger,
        private readonly platform: WOLZonePlatform,
        private readonly accessory: PlatformAccessory,
    ) {

        this.zone = accessory.context.device as ZoneConfig;

        // set accessory information
        this.accessory.getService(this.platform.Service.AccessoryInformation)!
            .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Slonick')
            .setCharacteristic(this.platform.Characteristic.Model, accessory.displayName)
            .setCharacteristic(this.platform.Characteristic.SerialNumber, accessory.UUID)
            .setCharacteristic(this.platform.Characteristic.FirmwareRevision, process.env["npm_package_version"] as string);

        this.motionSensorSleepService = this.accessory.getService(`Sleep - ${this.zone.name}`) ||
            this.accessory.addService(this.platform.Service.MotionSensor, `Sleep - ${this.zone.name}`, `${this.zone.name}.Sleep`,
            );

        this.motionSensorWakeService = this.accessory.getService(`Wake - ${this.zone.name}`) ||
            this.accessory.addService(this.platform.Service.MotionSensor, `Wake - ${this.zone.name}`, `${this.zone.name}.Wake`);

        this.devices = this.zone.devices.map(x => this.getDevice(x));
        this.devices.forEach(device => {
            this.log.debug(`Create or restore switch for ${device.name}`);

            const service =
                this.accessory.getService(device.name) ||
                this.accessory.addService(this.platform.Service.Switch, device.name, device.host);

            service.setCharacteristic(this.platform.Characteristic.Name, device.name);

            service.getCharacteristic(this.platform.Characteristic.On)
                .onSet(async (value: CharacteristicValue) => {
                    try {
                        const isOn = await device.getStatus();
                        if (isOn != value) {
                            await this.updateStatus(!isOn, true);
                            this.suspendUpdate = true;

                            value == true
                                ? await device.wake()
                                : await device.sleep();

                            this.suspendUpdate = true;
                        }
                    } catch (e) {
                        this.log.error(JSON.stringify(e));
                    }
                })
                .onGet(async () => await device.getStatus());
        });

        setTimeoutAsync(async () => {
                const isOnPromise = await Promise.all(this.devices.map(x => x.getStatus()));
                const isOn = isOnPromise.some(x => x);

                await this.updateStatus(isOn);
            },
            this.zone.interval * 1000
        )
    }

    private async updateStatus(isOn: boolean, immediate: boolean = false) {
        if (this.suspendUpdate) {
            return;
        }

        if (this.currentState !== isOn) {
            this.changes++;
            this.platform.log.debug(`${this.changes} of ${this.zone.changesForTrigger} required state changes.`);
        }

        if (this.changes >= this.accessory.context.device.changesForTrigger || immediate) {
            this.motionSensorSleepService!.updateCharacteristic(
                this.platform.Characteristic.MotionDetected,
                !isOn,
            );

            this.motionSensorWakeService!.updateCharacteristic(
                this.platform.Characteristic.MotionDetected,
                isOn,
            );

            this.currentState = isOn;
            this.changes = 0;
        }
    }

    private getDevice(device: ZoneDevice) {
        switch (device.platform) {
            case Platfotm.Windows:
                return Windows.fromConfig(device);
            case Platfotm.MacOS:
                return MacOS.fromConfig(device);
        }
    }
}
