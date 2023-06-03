import {API, Characteristic, DynamicPlatformPlugin, Logger, PlatformAccessory, Service} from 'homebridge';
import {PlatformConfig} from 'homebridge/lib/bridgeService';
import {WOLZoneAccessory} from './platformAccessory';
import {ZoneConfig} from './platformConfig';

import {PLATFORM_NAME, PLUGIN_NAME} from './settings';

export class WOLZonePlatform implements DynamicPlatformPlugin {
  public readonly Service: typeof Service = this.api.hap.Service;
  public readonly Characteristic: typeof Characteristic = this.api.hap.Characteristic;

  // this is used to track restored cached accessories
  public readonly accessories: PlatformAccessory[] = [];

  constructor(
    public readonly log: Logger,
    public readonly config: PlatformConfig,
    public readonly api: API,
  ) {
    this.log.debug('Finished initializing platform:', this.config.name);

    this.api.on('didFinishLaunching', () => {
      log.debug('Executed didFinishLaunching callback');
      this.discoverDevices();
    });
  }

  configureAccessory(accessory: PlatformAccessory) {
    this.log.info('Loading accessory from cache:', accessory.displayName);

    this.accessories.push(accessory);
  }

  discoverDevices() {
    for (const zone of this.config.zones) {
      if (!zone.name) {
        this.log.warn('Invalid zone config');
        continue;
      }

      this.setupAccessory(zone);
    }
  }

  setupAccessory(zone: ZoneConfig) {
    const uuid = this.api.hap.uuid.generate(zone.name);

    const existingAccessory = this.accessories.find(
      (accessory) => accessory.UUID === uuid,
    );

    if (existingAccessory) {
      this.log.info(
        'Restoring existing accessory from cache:',
        zone.name,
      );

      existingAccessory.context.device = zone;

      new WOLZoneAccessory(this.log, this, existingAccessory);
    } else {
      this.log.info('Adding new accessory:', zone.name);

      const accessory = new this.api.platformAccessory(
        zone.name,
        uuid,
      );
      accessory.context.device = zone;
      this.api.registerPlatformAccessories(PLUGIN_NAME, PLATFORM_NAME, [
        accessory,
      ]);

      new WOLZoneAccessory(this.log, this, accessory);
    }
  }
}
