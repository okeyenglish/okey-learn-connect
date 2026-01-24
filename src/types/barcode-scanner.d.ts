// Type declarations for @capacitor-community/barcode-scanner
// This module is only available in native Capacitor apps after running `npm install @capacitor-community/barcode-scanner` and `npx cap sync`

declare module '@capacitor-community/barcode-scanner' {
  export interface ScanResult {
    hasContent: boolean;
    content: string;
    format?: string;
  }

  export interface CheckPermissionResult {
    granted: boolean;
    denied: boolean;
    asked: boolean;
    neverAsked: boolean;
    restricted?: boolean;
    unknown?: boolean;
  }

  export interface CheckPermissionOptions {
    force?: boolean;
  }

  export const BarcodeScanner: {
    checkPermission(options?: CheckPermissionOptions): Promise<CheckPermissionResult>;
    startScan(): Promise<ScanResult>;
    stopScan(): Promise<void>;
    hideBackground(): Promise<void>;
    showBackground(): Promise<void>;
    prepare(): Promise<void>;
    openAppSettings(): Promise<void>;
  };
}
