export type PairedDevice = {
  name: string;
  address: string;
  /** Android major device class; 1536 is "imaging" (printers). */
  deviceClass: number;
};
