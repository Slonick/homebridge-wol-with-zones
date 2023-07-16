import {CharacteristicValue, PlatformAccessory, Service} from 'homebridge';

import {version} from './environments/version';
import {MacOS} from './plaforms/macos';
import {Platfotm, ZoneDevice} from './plaforms/platform';
import {Windows} from './plaforms/windows';

import {WOLZonePlatform} from './platform';
import {ZoneConfig} from './platformConfig';
import {setIntervalAsync} from './utilities';

export class WOLZoneAccessory {
  private changes = 0;
  private currentState = false;

  private zone: ZoneConfig;
  private devices: ZoneDevice[] = [];
  private motionSensorSleepService?: Service;
  private motionSensorWakeService?: Service;

  private constructor(
    private readonly platform: WOLZonePlatform,
    private readonly accessory: PlatformAccessory,
  ) {

    this.zone = accessory.context.device as ZoneConfig;
  }

  static Create(platform: WOLZonePlatform, accessory: PlatformAccessory) {
    const zoneAccessory = new WOLZoneAccessory(platform, accessory);
    zoneAccessory.setup();
  }

  private async updateStatusScheduler(immediate = false) {
    const isOnPromise = await Promise.all(this.devices.map(x => x.getStatus()));
    const isOn = isOnPromise.some(x => x);

    await this.updateStatus(isOn, immediate);
  }

  private async updateStatus(isOn: boolean, immediate = false) {
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
        return Windows.fromConfig(this.platform, device);
      case Platfotm.MacOS:
        return MacOS.fromConfig(this.platform, device);
    }
  }

  private setup() {
    // set accessory information
    this.accessory.getService(this.platform.Service.AccessoryInformation)!
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'Slonick')
      .setCharacteristic(this.platform.Characteristic.Model, this.accessory.displayName)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.accessory.UUID)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, version);

    this.motionSensorSleepService = this.accessory.getService(`Sleep - ${this.zone.name}`) ||
      this.accessory.addService(this.platform.Service.MotionSensor, `Sleep - ${this.zone.name}`, `${this.zone.name}.Sleep`,
      );

    this.motionSensorWakeService = this.accessory.getService(`Wake - ${this.zone.name}`) ||
      this.accessory.addService(this.platform.Service.MotionSensor, `Wake - ${this.zone.name}`, `${this.zone.name}.Wake`);

    this.devices = this.zone.devices.map(x => this.getDevice(x));
    this.devices.forEach(device => {
      if (!device.isValid()) {
        this.platform.log.warn('Invalid device config');
        return;
      }

      this.platform.log.debug(`Create or restore switch for ${device.name}`);

      const service =
        this.accessory.getService(device.name) ||
        this.accessory.addService(this.platform.Service.Switch, device.name, device.host);

      service.setCharacteristic(this.platform.Characteristic.Name, device.name);

      service.getCharacteristic(this.platform.Characteristic.On)
        .onSet(async (value: CharacteristicValue) => {
          try {
            const isOn = await device.getStatus();
            if (isOn !== value) {

              value === true
                ? await device.wake()
                : await device.sleep();

              await this.updateStatusScheduler(true);
            }
          } catch (e) {
            this.platform.log.error(JSON.stringify(e));
          }
        })
        .onGet(async () => await device.getStatus());
    });

    setIntervalAsync(async () => {
      await this.updateStatusScheduler();
    }, this.zone.interval * 1000);
  }
}
