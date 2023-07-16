import {WOLZonePlatform} from "../platform";


export enum Platfotm {
  Windows = 0,
  MacOS = 1
}

export abstract class ZoneDevice {
  platform: Platfotm = Platfotm.Windows;
  protected graceTimer: NodeJS.Timeout | undefined;

  protected constructor(protected pluginPlatform: WOLZonePlatform,
                        public name: string,
                        public host: string,) {
  }

  private _lastState: boolean = false;

  public get lastState(): boolean {
    return this._lastState;
  }

  protected set lastState(value: boolean) {
    if (!this.suspendUpdate) {
      this._lastState = value;
    }
  }

  private _suspendUpdate: boolean = false;

  public get suspendUpdate(): boolean {
    return this._suspendUpdate;
  }

  protected set suspendUpdate(value: boolean) {
    this._suspendUpdate = value;
  }

  abstract isValid(): boolean;

  abstract getStatus(fromCache: boolean): Promise<boolean>;

  abstract sleep(): Promise<void>;

  abstract wake(): Promise<void>;

  protected setGraceTimer(delay: number) {
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
    }

    this.graceTimer = setTimeout(() => this._suspendUpdate = false, delay);
  }

  protected setSuspendUpdate(suspendUpdate: boolean, value: boolean | null = null) {
    this.suspendUpdate = suspendUpdate;

    if (value !== null) {
      this._lastState = value;
    }
  }
}