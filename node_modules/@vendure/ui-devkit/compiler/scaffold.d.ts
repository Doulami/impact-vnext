import { Extension } from './types';
export declare function setupScaffold(outputPath: string, extensions: Extension[]): Promise<void>;
export declare function copyGlobalStyleFile(outputPath: string, stylePath: string): Promise<void>;
export declare function setBaseHref(outputPath: string, baseHref: string): Promise<void>;
