import 'reflect-metadata';
export declare const mockFileSystem: {
    existsSync: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    readFileSync: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    writeFileSync: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    mkdirSync: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
    statSync: import("jest-mock").Mock<import("jest-mock").UnknownFunction>;
};
export declare const cliTestHelpers: {
    setCliArgs: (...args: string[]) => void;
    captureConsoleOutput: () => {
        outputs: {
            type: string;
            message: string;
        }[];
        restore: () => void;
    };
    catchErrors: (fn: () => Promise<any>) => Promise<any>;
};
