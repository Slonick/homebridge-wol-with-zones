import {execAsync, ExecResult, wait} from "../utilities";
import {ZoneDevice} from './platform';
import {WOLZonePlatform} from "../platform";

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

  constructor(pluginPlatform: WOLZonePlatform,
              name: string,
              public architecture: MacArchitecture,
              host: string,
              public username: string,
              public wakeGraceTime: number,
              public shutdownGraceTime: number) {
    super(pluginPlatform, name, host);

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

  static fromConfig(pluginPlatform: WOLZonePlatform, config: any): MacOS {
    return new MacOS(
      pluginPlatform,
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

        if (!this.suspendUpdate) {
          this.lastState = this._statusCommand.isOn(result.stdout.toString());
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
      await this.execSSH('pmset displaysleepnow');
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
      await this.execSSH('caffeinate -u -t 1');
      await wait(this.wakeGraceTime * 1000);
    } catch (e) {
      this.pluginPlatform.log.error(`An error occurred while waking ${this.name} (${this.host}): ${e}`);
    } finally {
      this.suspendUpdate = false;
    }
  }

  private async execSSH(command: string): Promise<ExecResult> {
    return await execAsync(
      `ssh ${this.username}@${this.host} '${command}'`, {
        timeout: 5000
      }
    );
  }

}