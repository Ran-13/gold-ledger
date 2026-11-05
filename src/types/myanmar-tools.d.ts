declare module 'myanmar-tools' {
  export class ZawgyiDetector {
    getZawgyiProbability(input: string): number;
  }
  export class ZawgyiConverter {
    zawgyiToUnicode(input: string): string;
    unicodeToZawgyi(input: string): string;
  }
  const myanmarTools: {
    ZawgyiDetector: typeof ZawgyiDetector;
    ZawgyiConverter: typeof ZawgyiConverter;
  };
  export default myanmarTools;
}
