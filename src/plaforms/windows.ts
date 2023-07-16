import ping from "ping"
import {execAsync, wait, wake} from "../utilities";
import {ZoneDevice} from './platform';
import {WOLZonePlatform} from "../platform";

export class Windows extends ZoneDevice {

  constructor(platform: WOLZonePlatform,
              name: string,
              host: string,
              public mac: string,
              public username: string,
              public password: string,
              public wakeGraceTime: number,
              public shutdownGraceTime: number
  ) {
    super(platform, name, host);
  }

  static fromConfig(pluginPlatform: WOLZonePlatform, config: any): Windows {
    return new Windows(
      pluginPlatform,
      config.name,
      config.host,
      config.mac,
      config.username,
      config.password,
      config.wakeGraceTime,
      config.shutdownGraceTime
    );
  }

  isValid(): boolean {
    return <boolean>(
      this.name &&
      this.host &&
      this.mac &&
      this.username &&
      this.password &&
      this.wakeGraceTime >= 0 &&
      this.shutdownGraceTime >= 0
    );
  }

  async getStatus(): Promise<boolean> {
    if (!this.suspendUpdate) {
      try {
        const response = await ping.promise.probe(this.host, {
          timeout: 1
        });

        if (!this.suspendUpdate) {
          this.lastState = response.alive;
        }
        
      } catch (e) {
        this.pluginPlatform.log.error(`An error occurred while update status for ${this.name} (${this.host}): ${e}`);
      }
    }

    return this.lastState;
  }

  async sleep(): Promise<void> {
    try {
      this.suspendUpdate = true;
      this.lastState = false;
      await execAsync(`net rpc shutdown --ipaddress ${this.host} --user ${this.username}%${this.password}`);
      await wait(this.shutdownGraceTime * 1000);
    } catch (e) {
      this.pluginPlatform.log.error(`An error occurred while sleeping ${this.name} (${this.host}): ${e}`);
    } finally {
      this.suspendUpdate = false;
    }
  }

  async wake(): Promise<void> {
    try {
      this.suspendUpdate = true;
      this.lastState = true;
      await wake(this.mac);
      await wait(this.wakeGraceTime * 1000);
    } catch (e) {
      this.pluginPlatform.log.error(`An error occurred while waking ${this.name} (${this.host}): ${e}`);
    } finally {
      this.suspendUpdate = false;
    }
  }

}