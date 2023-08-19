import {ZoneDevice} from './platform';
import {WOLZonePlatform} from "../platform";
import {Client} from "ssh2";

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
  private client!: Client;

  constructor(pluginPlatform: WOLZonePlatform,
              name: string,
              public architecture: MacArchitecture,
              host: string,
              private port: number,
              public username: string,
              public password: string,
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

    this.setupSSH();
  }

  static fromConfig(pluginPlatform: WOLZonePlatform, config: any): MacOS {
    return new MacOS(
      pluginPlatform,
      config.name,
      config.architecture,
      config.host,
      config.port,
      config.username,
      config.password,
      config.wakeGraceTime,
      config.shutdownGraceTime
    );
  }

  isValid(): boolean {
    return <boolean>(
      this.name &&
      this.architecture &&
      this.host &&
      this.port &&
      this.username &&
      this.password &&
      this.wakeGraceTime >= 0 &&
      this.shutdownGraceTime >= 0
    );
  }

  async getStatus(fromCache: boolean): Promise<boolean> {
    if (!this.suspendUpdate && !fromCache) {
      try {
        const result = await this.execSSH(this._statusCommand.command);
        this.lastState = this._statusCommand.isOn(result);
      } catch (e) {
        this.pluginPlatform.log.error(`An error occurred while update status for ${this.name} (${this.host}):`, e);
      }
    }

    return this.lastState;
  }

  async sleep(): Promise<void> {
    try {
      this.setSuspendUpdate(true, false);
      await this.execSSH('pmset displaysleepnow');
      this.setGraceTimer(this.shutdownGraceTime * 1000);
    } catch (e) {
      this.pluginPlatform.log.error(`An error occurred while sleeping ${this.name} (${this.host}):`, e);
      this.suspendUpdate = false;
    }
  }

  async wake(): Promise<void> {
    try {
      this.setSuspendUpdate(true, true);
      await this.execSSH('caffeinate -u -t 1');
      this.setGraceTimer(this.wakeGraceTime * 1000);
    } catch (e) {
      this.pluginPlatform.log.error(`An error occurred while waking ${this.name} (${this.host}):`, e);
      this.suspendUpdate = false;
    }
  }

  private async execSSH(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.client.on('ready', () => {
        this.client.exec(command, (err, stream) => {

          if (err) {
            reject(err);
          }

          stream.stdout.on('data', (data: string | Buffer) => {
            this.pluginPlatform.log.debug('stdout:data', data);
            resolve(data.toString());
          });

          stream.on('data', (data: string | Buffer) => {
            this.pluginPlatform.log.debug('stream:data', data);
            resolve(data.toString());
          });

          stream.on('finish', (data: string | Buffer) => {
            this.pluginPlatform.log.debug('stream:finish', data);
            resolve(data.toString());
          });

          stream.on('error', (data: string | Buffer) => {
            this.pluginPlatform.log.debug('stream:error', data);
            reject(data.toString());
          });

          stream.stderr.on('data', (data: string | Buffer) => {
            this.pluginPlatform.log.debug('stderr:data', data);
            reject(data.toString());
          });

        });
      });
    });
  }

  private setupSSH() {
    this.client = new Client();

    this.client.on('ready', () => {
      this.pluginPlatform.log.debug(`Client ${this.host}:${this.port}@${this.username} :: ready`);

      this.client.exec('uptime', (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          this.pluginPlatform.log.debug('Stream :: close :: code: ' + code + ', signal: ' + signal);
          this.client.end();
        }).on('data', (data) => {
          this.pluginPlatform.log.debug('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
          this.pluginPlatform.log.debug('STDERR: ' + data);
        });
      });
      
    }).connect({
      host: this.host,
      port: this.port,
      username: this.username,
      password: this.password,
      timeout: 5000
    });
  }
}