"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cliTestHelpers = exports.mockFileSystem = void 0;
const globals_1 = require("@jest/globals");
require("reflect-metadata");
const originalArgv = process.argv;
beforeEach(() => {
    process.argv = ['node', 'jest'];
});
afterEach(() => {
    process.argv = originalArgv;
});
global.console = {
    ...console,
    log: globals_1.jest.fn(),
    error: globals_1.jest.fn(),
    warn: globals_1.jest.fn(),
    info: globals_1.jest.fn(),
    debug: globals_1.jest.fn(),
};
const originalExit = process.exit;
beforeEach(() => {
    process.exit = globals_1.jest.fn();
});
afterEach(() => {
    process.exit = originalExit;
});
const originalCwd = process.cwd;
beforeEach(() => {
    process.cwd = globals_1.jest.fn(() => '/tmp/claude-auto-worker-test');
});
afterEach(() => {
    process.cwd = originalCwd;
});
const originalEnv = process.env;
beforeEach(() => {
    process.env = {
        ...originalEnv,
        NODE_ENV: 'test',
        PORT: '5849',
    };
});
afterEach(() => {
    process.env = originalEnv;
});
exports.mockFileSystem = {
    existsSync: globals_1.jest.fn(),
    readFileSync: globals_1.jest.fn(),
    writeFileSync: globals_1.jest.fn(),
    mkdirSync: globals_1.jest.fn(),
    statSync: globals_1.jest.fn(),
};
exports.cliTestHelpers = {
    setCliArgs: (...args) => {
        process.argv = ['node', 'claude-auto-worker', ...args];
    },
    captureConsoleOutput: () => {
        const outputs = [];
        const originalLog = console.log;
        const originalError = console.error;
        const originalWarn = console.warn;
        console.log = globals_1.jest.fn((...args) => {
            outputs.push({ type: 'log', message: args.join(' ') });
            originalLog(...args);
        });
        console.error = globals_1.jest.fn((...args) => {
            outputs.push({ type: 'error', message: args.join(' ') });
            originalError(...args);
        });
        console.warn = globals_1.jest.fn((...args) => {
            outputs.push({ type: 'warn', message: args.join(' ') });
            originalWarn(...args);
        });
        return {
            outputs,
            restore: () => {
                console.log = originalLog;
                console.error = originalError;
                console.warn = originalWarn;
            }
        };
    },
    catchErrors: async (fn) => {
        try {
            return await fn();
        }
        catch (error) {
            return { error };
        }
    }
};
globals_1.jest.mock('fs', () => exports.mockFileSystem);
globals_1.jest.mock('path', () => ({
    resolve: globals_1.jest.fn((...args) => args.join('/')),
    join: globals_1.jest.fn((...args) => args.join('/')),
    dirname: globals_1.jest.fn((path) => path.split('/').slice(0, -1).join('/') || '.'),
    basename: globals_1.jest.fn((path) => path.split('/').pop() || ''),
    extname: globals_1.jest.fn((path) => {
        const parts = path.split('.');
        return parts.length > 1 ? `.${parts.pop()}` : '';
    }),
    sep: '/',
    delimiter: ':',
}));
globals_1.jest.mock('nest-commander', () => {
    const originalModule = globals_1.jest.requireActual('nest-commander');
    return {
        Command: globals_1.jest.fn().mockImplementation((options) => {
            return function (target) {
                Reflect.defineMetadata('command', options, target);
                return target;
            };
        }),
        CommandRunner: globals_1.jest.fn().mockImplementation(() => {
            return class MockCommandRunner {
                run = globals_1.jest.fn();
            };
        }),
        CommandFactory: {
            run: globals_1.jest.fn(),
            runAsync: globals_1.jest.fn(),
        },
        Option: globals_1.jest.fn().mockImplementation((options) => {
            return function (target, propertyKey) {
                if (!Reflect.hasMetadata('options', target.constructor)) {
                    Reflect.defineMetadata('options', [], target.constructor);
                }
                const options_ = Reflect.getMetadata('options', target.constructor);
                options_.push({ ...options, propertyKey });
                Reflect.defineMetadata('options', options_, target.constructor);
                return target;
            };
        }),
        Arguments: globals_1.jest.fn(),
    };
});
globals_1.jest.mock('@nestjs/common', () => {
    const originalModule = globals_1.jest.requireActual('@nestjs/common');
    return {
        Injectable: globals_1.jest.fn().mockImplementation(() => {
            return function (target) {
                Reflect.defineMetadata('injectable', true, target);
                return target;
            };
        }),
    };
});
//# sourceMappingURL=cli.setup.js.map