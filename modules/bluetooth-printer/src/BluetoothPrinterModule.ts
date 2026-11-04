import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { PairedDevice } from './BluetoothPrinter.types';

declare class BluetoothPrinterModule extends NativeModule<{}> {
  isEnabled(): boolean;
  getPairedDevices(): Promise<PairedDevice[]>;
  /** Sends raw ESC/POS bytes (base64) to the printer at `address`. */
  print(address: string, base64: string): Promise<void>;
}

/** Null on iOS, web and Expo Go, where the native module is not built in. */
export default requireOptionalNativeModule<BluetoothPrinterModule>('BluetoothPrinter');
