import {execAsync, ExecResult, wait} from "../utilities";
import {ZoneDevice} from './platform';

export enum MacArchitecture {
  intel,
  silicon
}

export type StatusCommand = {
  command: string;
  isOn: (value: string) => boolean;
}

export class MacOS extends ZoneDevice {
  private _statusCommand: StatusCommand;

  constructor(public name: string,
              public architecture: MacArchitecture,
              public host: string,
              public username: string,
              public wakeGraceTime: number,
              public shutdownGraceTime: number) {
    super(name, host);

    switch (this.architecture) {
      case MacArchitecture.intel:
        this._statusCommand = {
          command:
            'system_profiler SPDisplaysDataType | grep "Display Asleep" | wc -l',
          isOn: (value: string) => parseInt(value) <= 0,
        };
        break;
      case MacArchitecture.silicon:
        this._statusCommand = {
          command:
            'system_profiler SPDisplaysDataType | grep "Display Asleep" | wc -l',
          isOn: (value: string) => parseInt(value) <= 0,
        };
        break;
    }
  }

  static fromConfig(config: any): MacOS {
    return new MacOS(
      config.name,
      config.architecture,
      config.host,
      config.username,
      config.wakeGraceTime,
      config.shutdownGraceTime,
    );
  }

  isValid(): boolean {
    return <boolean>(
      this.name &&
      this.architecture &&
      this.host &&
      this.username &&
      this.wakeGraceTime >= 0 &&
      this.shutdownGraceTime >= 0
    );
  }

  async getStatus(): Promise<boolean> {
    if (!this.suspendUpdate) {
      try {
        const result = await this.execSSH(this._statusCommand.command);
        this.lastState = this._statusCommand.isOn(result.stdout.toString());
      } catch (e) {
        //ignored
      }
    }

    return this.lastState;
  }

  async sleep(): Promise<void> {
    this.suspendUpdate = true;
    await this.execSSH('pmset sleepnow');
    await wait(this.shutdownGraceTime * 1000);
    this.suspendUpdate = false;
  }

  async wake(): Promise<void> {
    this.suspendUpdate = true;
    await this.execSSH('caffeinate -u -t 1');
    await wait(this.wakeGraceTime * 1000);
    this.suspendUpdate = false;
  }

  private async execSSH(command: string): Promise<ExecResult> {
    return await execAsync(
      `ssh ${this.username}@${this.host} '${command}'`, {
        timeout: 5000
      }
    );
  }

}