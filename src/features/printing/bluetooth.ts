import { PermissionsAndroid, Platform } from 'react-native';

import BluetoothPrinter, { type PairedDevice } from '@modules/bluetooth-printer';

export type { PairedDevice };

/** True in the Android app build. False on iOS, web and Expo Go. */
export const bluetoothSupported = Platform.OS === 'android' && !!BluetoothPrinter;

/** Android 12+ needs the "Nearby devices" permission to talk to paired printers. */
async function ensurePermission() {
  if (Platform.OS !== 'android' || Platform.Version < 31) return;
  const res = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT, {
    title: 'Connect to your printer',
    message: 'Allow access to nearby devices so the app can print receipts on your Bluetooth printer.',
    buttonPositive: 'Allow',
  });
  if (res !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error('Nearby devices permission is needed to print. You can allow it in Android Settings › Apps.');
  }
}

function module() {
  if (!BluetoothPrinter) throw new Error('Bluetooth printing works in the installed app (APK), not in Expo Go.');
  return BluetoothPrinter;
}

/** Devices paired in Android's Bluetooth settings, printers first. */
export async function listPairedPrinters(): Promise<PairedDevice[]> {
  await ensurePermission();
  const devices = await module().getPairedDevices();
  const IMAGING = 1536;
  return [...devices].sort((a, b) => Number(b.deviceClass === IMAGING) - Number(a.deviceClass === IMAGING) || a.name.localeCompare(b.name));
}

export async function printBluetooth(address: string, base64: string) {
  await ensurePermission();
  await module().print(address, base64);
}
