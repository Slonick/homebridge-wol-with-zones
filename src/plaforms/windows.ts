import ping from "ping"
import {execAsync, wait, wake} from "../utilities";
import {ZoneDevice} from './platform';

export class Windows extends ZoneDevice {

  constructor(public name: string,
              public host: string,
              public mac: string,
              public username: string,
              public password: string,
              public wakeGraceTime: number,
              public shutdownGraceTime: number
  ) {
    super(name, host);
  }

  static fromConfig(config: any): Windows {
    return new Windows(
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
      const response = await ping.promise.probe(this.host, {
        timeout: 1
      });

      this.lastState = response.alive;
    }

    return this.lastState;
  }

  async sleep(): Promise<void> {
    this.suspendUpdate = true;
    this.lastState = false;
    await execAsync(`net rpc shutdown --ipaddress ${this.host} --user ${this.username}%${this.password}`);
    await wait(this.shutdownGraceTime * 1000);
    this.suspendUpdate = false;
  }

  async wake(): Promise<void> {
    this.suspendUpdate = true;
    this.lastState = true;
    await wake(this.mac);
    await wait(this.wakeGraceTime * 1000);
    this.suspendUpdate = false;
  }

}