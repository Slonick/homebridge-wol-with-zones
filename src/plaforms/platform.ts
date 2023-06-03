import EventEmitter from 'events';


export enum Platfotm {
  Windows = 0,
  MacOS = 1
}

export abstract class ZoneDevice {
  readonly stateChanged: PlatformEventEmitter = new PlatformEventEmitter;

  platform: Platfotm = Platfotm.Windows;

  protected lastState: boolean = false;
  protected suspendUpdate: boolean = false;

  protected constructor(public name: string,
                        public host: string,) {
  }

  abstract isValid(): boolean;

  abstract getStatus(): Promise<boolean>;

  abstract sleep(): Promise<void>;

  abstract wake(): Promise<void>;
}

export class PlatformEventEmitter extends EventEmitter {

  private _stateKey = 'stateChanged';

  onStateChanged(callback: (state: boolean) => void): this {
    return this.on(this._stateKey, callback);
  }

  stateChanged(state: boolean): void {
    this.emit(this._stateKey, state);
  }

}