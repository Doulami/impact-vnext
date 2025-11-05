export interface ExtensionHostOptions {
    extensionUrl: string;
    openInNewTab?: boolean;
}
export declare class ExtensionHostConfig {
    extensionUrl: string;
    openInNewTab: boolean;
    constructor(options: ExtensionHostOptions);
}
