import {exec as execSync} from 'child_process';
import {promisify} from 'util';

import wol from 'wake_on_lan';

/** An async version of Node's {@link exec}. */
export const execAsync = promisify(execSync);

export type ExecResult = {
  stdout: string | Buffer;
  stderr: string;
};

/**
 * Send WoL magic packets.
 * @param macAddress The MAC address of the target.
 */
export function wake(macAddress: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    wol.wake(macAddress, (error: Error) => {
      if (error) {
        return reject(error);
      }

      resolve();
    });
  });
}

/**
 * Wait for the specified number of milliseconds.
 * @param milliseconds The number of milliseconds to wait.
 */
export function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export function setIntervalAsync(fn: () => Promise<void>, delay: number): () => void {
  let handle: NodeJS.Timeout | undefined;
  const loop = async () => {
    await fn();
    handle = setTimeout(loop, delay);
  };
  handle = setTimeout(loop, delay);
  return () => {
    if (handle) {
      clearTimeout(handle);
    }
  };
}