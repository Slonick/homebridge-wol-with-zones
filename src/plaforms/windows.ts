import {ZoneDevice} from './platform';
import ping from "ping"
import {execAsync, wait, wake} from "../utilities";

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
        console.info(`Sleep ${this.name}`);

        this.suspendUpdate = true;
        this.lastState = false;
        await execAsync(`net rpc shutdown --ipaddress ${this.host} --user ${this.username}%${this.password}`);
        await wait(this.shutdownGraceTime * 1000);
        this.suspendUpdate = false;
    }

    async wake(): Promise<void> {
        console.info(`Wake ${this.name}`);

        this.suspendUpdate = true;
        this.lastState = true;
        await wake(this.mac);
        await wait(this.wakeGraceTime * 1000);
        this.suspendUpdate = false;
    }

}