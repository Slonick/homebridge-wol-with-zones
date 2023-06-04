import {ZoneDevice} from './plaforms/platform';

export interface ZoneConfig {
  name: string;
  devices: ZoneDevice[];
  interval: number;
  changesForTrigger: number;
}
