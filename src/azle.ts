import { execSync, IOType, spawnSync } from 'child_process';
import { compileTypeScriptToJavaScript } from './compiler/typescript_to_javascript';
import {
    generateLibCargoToml,
    generateWorkspaceCargoLock,
    generateWorkspaceCargoToml
} from './compiler/typescript_to_javascript/cargo_toml_files';
import * as fs from 'fs';
import * as fsExtra from 'fs-extra';
import {
    AzleError,
    DfxJson,
    JavaScript,
    JSCanisterConfig,
    RunOptions,
    Rust,
    Toml,
    TsCompilationError,
    TsSyntaxErrorLocation
} from './types';
import { Err, ok, Ok, Result, unwrap } from './result';
import { red, yellow, green, blue, purple, dim } from './colors';
import * as tsc from 'typescript';
import * as path from 'path';
import { version, dfx_version, rust_version } from '../package.json';
import { generate_new_azle_project } from './new';

const GLOBAL_AZLE_CONFIG_DIR = path.resolve(
    require('os').homedir(),
    `.config/azle/${version}`
);
const GLOBAL_AZLE_BIN_DIR = `${GLOBAL_AZLE_CONFIG_DIR}/bin`;
const GLOBAL_AZLE_TARGET_DIR = `${GLOBAL_AZLE_CONFIG_DIR}/target`;

azle();

function azle() {
    if (process.argv[2] === 'new') {
        generate_new_azle_project(version, dfx_version);
        return;
    }

    const install_rust_dependencies_path = path.resolve(
        __dirname,
        '../install_rust_dependencies.sh'
    );

    execSync(`"${install_rust_dependencies_path}" ${version} ${rust_version}`, {
        stdio: 'inherit'
    });

    const stdio_type = getStdIoType();
    const canister_name = unwrap(getCanisterName(process.argv));
    const canister_path = `.azle/${canister_name}`;
    const wasm_file_path = `${canister_path}/${canister_name}.wasm`;

    time(`\nBuilding canister ${green(canister_name)}`, 'default', () => {
        const canister_config = unwrap(getCanisterConfig(canister_name));
        const candid_path = canister_config.candid;

        printFirstBuildWarning();
        compileTypeScriptToRust(
            canister_name,
            canister_path,
            canister_config.root,
            canister_config.ts
        );
        compileRustCode(canister_name, canister_path, stdio_type);
        generateCandidFile(candid_path, wasm_file_path);
        optimize_rust_code(wasm_file_path, candid_path, stdio_type);
    });

    logSuccess(canister_path, canister_name);
}

function addCandidToWasmMetaData(
    candid_path: string,
    wasm_file_path: string
): void {
    execSync(
        `${GLOBAL_AZLE_BIN_DIR}/ic-wasm ${wasm_file_path} -o ${wasm_file_path} metadata candid:service -f ${candid_path} -v public`
    );

    execSync(
        `${GLOBAL_AZLE_BIN_DIR}/ic-wasm ${wasm_file_path} -o ${wasm_file_path} metadata cdk -d "azle ${version}" -v public`
    );
}

function colorFormattedDfxJsonExample(canisterName: string): string {
    return `    ${yellow('{')}
        ${red('"canisters"')}: ${purple('{')}
            ${red(`"${canisterName}"`)}: ${blue('{')}
                ${red('"type"')}: ${green('"custom"')},
                ${red('"build"')}: ${green(`"npx azle ${canisterName}"`)},
                ${red('"root"')}: ${green('"src"')},
                ${red('"ts"')}: ${green('"src/index.ts"')},
                ${red('"candid"')}: ${green('"src/index.did"')},
                ${red('"wasm"')}: ${green(
        `".azle/${canisterName}/${canisterName}.wasm.gz"`
    )},
            ${blue('}')}
        ${purple('}')}
    ${yellow('}')}`;
}

function compileRustCode(
    canister_name: string,
    canister_path: string,
    stdio: IOType
) {
    time(`[2/3] 🚧 Building Wasm binary...`, 'inline', () => {
        execSync(
            `cd ${canister_path} && ${GLOBAL_AZLE_BIN_DIR}/cargo build --target wasm32-unknown-unknown --package ${canister_name} --release`,
            {
                stdio,
                env: {
                    ...process.env,
                    CARGO_TARGET_DIR: GLOBAL_AZLE_TARGET_DIR,
                    CARGO_HOME: GLOBAL_AZLE_CONFIG_DIR,
                    RUSTUP_HOME: GLOBAL_AZLE_CONFIG_DIR
                }
            }
        );

        const wasm_target_file_path = `${GLOBAL_AZLE_CONFIG_DIR}/target/wasm32-unknown-unknown/release/${canister_name}.wasm`;

        execSync(`cp ${wasm_target_file_path} ${canister_path}`);
    });
}

function optimize_rust_code(
    wasm_file_path: string,
    candid_path: string,
    stdio: IOType
) {
    time(`[3/3] 🚀 Optimizing Wasm binary...`, 'inline', () => {
        // optimization, binary is too big to deploy without this
        execSync(
            `${GLOBAL_AZLE_BIN_DIR}/ic-cdk-optimizer ${wasm_file_path} -o ${wasm_file_path}`,
            {
                stdio,
                env: {
                    ...process.env,
                    CARGO_TARGET_DIR: GLOBAL_AZLE_TARGET_DIR,
                    CARGO_HOME: GLOBAL_AZLE_CONFIG_DIR,
                    RUSTUP_HOME: GLOBAL_AZLE_CONFIG_DIR
                }
            }
        );

        addCandidToWasmMetaData(candid_path, wasm_file_path);

        execSync(`gzip -f -k ${wasm_file_path}`, { stdio });
    });
}

function compileTypeScriptToRust(
    canister_name: string,
    canister_path: string,
    root_path: string,
    ts_path: string
): void | never {
    time('\n[1/3] 🔨 Compiling TypeScript...', 'inline', () => {
        const compilationResult = compileTypeScriptToJavaScript(ts_path);

        if (!ok(compilationResult)) {
            const azleErrorResult = compilationErrorToAzleErrorResult(
                compilationResult.err
            );
            unwrap(azleErrorResult);
        }

        const main_js = compilationResult.ok;
        const workspaceCargoToml: Toml = generateWorkspaceCargoToml(root_path);
        const workspaceCargoLock: Toml = generateWorkspaceCargoLock();
        const libCargoToml: Toml = generateLibCargoToml(canister_name);
        const fileNames = getFileNames(ts_path);

        writeCodeToFileSystem(
            root_path,
            canister_path,
            workspaceCargoToml,
            workspaceCargoLock,
            libCargoToml,
            main_js as any
        );

        unwrap(generateRustCanister(fileNames, canister_path, { root_path }));

        if (isCompileOnlyMode()) {
            console.log('Compilation complete!');
            process.exit(0);
        }
    });
}

function generateCandidFile(candid_path: string, wasm_file_path: string) {
    const wasm_buffer = fs.readFileSync(wasm_file_path);

    const wasm_module = new WebAssembly.Module(wasm_buffer);
    const wasm_instance = new WebAssembly.Instance(wasm_module, {
        ic0: {
            msg_reply: () => {},
            stable_size: () => {},
            stable64_size: () => {},
            stable_write: () => {},
            stable_read: () => {},
            debug_print: () => {},
            trap: () => {},
            time: () => {},
            msg_caller_size: () => {},
            msg_caller_copy: () => {},
            canister_self_size: () => {},
            canister_self_copy: () => {},
            canister_cycle_balance: () => {},
            canister_cycle_balance128: () => {},
            certified_data_set: () => {},
            data_certificate_present: () => {},
            data_certificate_size: () => {},
            data_certificate_copy: () => {},
            msg_reply_data_append: () => {},
            call_cycles_add128: () => {},
            call_new: () => {},
            call_data_append: () => {},
            call_perform: () => {},
            call_cycles_add: () => {},
            call_on_cleanup: () => {},
            msg_reject_code: () => {},
            msg_reject_msg_size: () => {},
            msg_reject_msg_copy: () => {},
            msg_reject: () => {},
            msg_cycles_available: () => {},
            msg_cycles_refunded: () => {},
            msg_cycles_refunded128: () => {},
            msg_cycles_accept: () => {},
            msg_cycles_accept128: () => {},
            msg_arg_data_size: () => {},
            msg_arg_data_copy: () => {},
            accept_message: () => {},
            msg_method_name_size: () => {},
            msg_method_name_copy: () => {},
            performance_counter: () => {},
            stable_grow: () => {},
            stable64_grow: () => {},
            stable64_write: () => {},
            stable64_read: () => {},
            global_timer_set: () => {}
        }
    });

    const candid_pointer = (
        wasm_instance.exports as any
    )._cdk_get_candid_pointer();

    const memory = new Uint8Array((wasm_instance.exports.memory as any).buffer);

    let candid_bytes = [];
    let i = candid_pointer;
    while (memory[i] !== 0) {
        candid_bytes.push(memory[i]);
        i += 1;
    }

    fs.writeFileSync(candid_path, Buffer.from(candid_bytes));
}

function generateRustCanister(
    fileNames: string[],
    canister_path: string,
    { root_path }: RunOptions
): Result<undefined, AzleError> {
    const azleGenerateResult = runAzleGenerate(fileNames, canister_path, {
        root_path
    });

    if (!ok(azleGenerateResult)) {
        return Err(azleGenerateResult.err);
    }

    const unformattedLibFile = azleGenerateResult.ok;

    fs.writeFileSync(
        `${canister_path}/${root_path}/src/lib.rs`,
        unformattedLibFile
    );

    const runRustFmtResult = runRustFmt(unformattedLibFile, canister_path, {
        root_path
    });

    if (!ok(runRustFmtResult)) {
        return Err(runRustFmtResult.err);
    }

    const formattedLibFile = runRustFmtResult.ok;

    fs.writeFileSync(
        `${canister_path}/${root_path}/src/lib.rs`,
        formattedLibFile
    );

    if (isVerboseMode()) {
        console.info(
            `Wrote formatted lib.rs file to ${canister_path}/${root_path}/src/lib.rs\n`
        );
    }
    return Ok(undefined);
}

function generateVisualDisplayOfErrorLocation(
    location: TsSyntaxErrorLocation
): string {
    const { file, line, column, lineText } = location;
    const marker = red('^'.padStart(column + 1));
    const preciseLocation = dim(`${file}:${line}:${column}`);
    const previousLine =
        line > 1
            ? dim(`${(line - 1).toString().padStart(line.toString().length)}| `)
            : '';
    const offendingLine = `${dim(`${line}| `)}${lineText}`;
    const subsequentLine = `${dim(
        `${(line + 1).toString().padStart(line.toString().length)}| `
    )}${marker}`;
    return `${preciseLocation}\n${previousLine}\n${offendingLine}\n${subsequentLine}`;
}

function getCanisterConfig(
    canisterName: string
): Result<JSCanisterConfig, AzleError> {
    const exampleDfxJson = colorFormattedDfxJsonExample(canisterName);

    if (!fs.existsSync(`dfx.json`)) {
        return Err({
            error: 'Missing dfx.json',
            suggestion: `Create a dfx.json file in the current directory with the following format:\n\n${exampleDfxJson}`,
            exitCode: 2
        });
    }

    const dfxJson: DfxJson = JSON.parse(fs.readFileSync('dfx.json').toString());
    const canisterConfig = dfxJson.canisters[canisterName];

    if (!canisterConfig) {
        return Err({
            error: `Unable to find canister "${canisterName}" in ./dfx.json`,
            suggestion: `Make sure your dfx.json contains an entry for "${canisterName}". For example:\n\n${exampleDfxJson}`,
            exitCode: 3
        });
    }

    const { root, ts, candid } = canisterConfig;

    if (!root || !ts || !candid) {
        const missingFields = [
            ['"root"', root],
            ['"ts"', ts],
            ['"candid"', candid]
        ]
            .filter(([_, value]) => !value)
            .map(([field, _]) => field);
        const fieldOrFields = missingFields.length == 1 ? 'field' : 'fields';
        const missingFieldNames = missingFields.join(', ');
        return Err({
            error: `Missing ${fieldOrFields} ${missingFieldNames} in ./dfx.json`,
            suggestion: `Make sure your dfx.json looks similar to the following:\n\n${exampleDfxJson}`,
            exitCode: 4
        });
    }

    return Ok(canisterConfig);
}

function getCanisterName(args: string[]): Result<string, AzleError> {
    const canisterNames = args.slice(2).filter((arg) => !isCliFlag(arg));

    if (canisterNames.length === 0) {
        return Err({ suggestion: `azle v${version}\n\n${getUsageInfo()}` });
    }

    if (canisterNames.length > 1) {
        return Err({
            error: 'Too many arguments',
            suggestion: getUsageInfo(),
            exitCode: 1
        });
    }
    const canisterName = canisterNames[0];

    return Ok(canisterName);
}

function getUsageInfo(): string {
    return `Usage: azle ${dim('[-v|--verbose]')} ${green('<canister_name>')}`;
}

function getFileNames(tsPath: string): string[] {
    const program = tsc.createProgram([tsPath], {});
    const sourceFiles = program.getSourceFiles();

    const fileNames = sourceFiles.map((sourceFile) => {
        if (!sourceFile.fileName.startsWith('/')) {
            return path.join(process.cwd(), sourceFile.fileName);
        } else {
            return sourceFile.fileName;
        }
    });
    return fileNames;
}

function getStdIoType() {
    return isVerboseMode() ? 'inherit' : 'pipe';
}

function isCliFlag(arg: string): boolean {
    return arg.startsWith('--') || arg.startsWith('-');
}

function isInitialCompile(): boolean {
    return !fs.existsSync(GLOBAL_AZLE_TARGET_DIR);
}

function isTsCompilationError(error: unknown): error is TsCompilationError {
    if (
        error &&
        typeof error === 'object' &&
        'stack' in error &&
        'message' in error &&
        'errors' in error &&
        'warnings' in error
    ) {
        return true;
    }
    return false;
}

function isVerboseMode(): boolean {
    return process.argv.includes('--verbose') || process.argv.includes('-v');
}

function isCompileOnlyMode(): boolean {
    return (
        process.argv.includes('--compile-only') || process.argv.includes('-c')
    );
}

function logSuccess(canister_path: string, canisterName: string): void {
    console.info(
        `\n🎉 Built canister ${green(canisterName)} ${dim(
            `at ${canister_path}/${canisterName}.wasm.gz`
        )}`
    );
}

function compilationErrorToAzleErrorResult(error: unknown): Err<AzleError> {
    if (isTsCompilationError(error)) {
        const firstError = error.errors[0];
        const codeSnippet = generateVisualDisplayOfErrorLocation(
            firstError.location
        );
        return Err({
            error: `There's something wrong in your TypeScript: ${firstError.text}`,
            suggestion: codeSnippet,
            exitCode: 5
        });
    } else {
        return Err({
            error: `Unable to compile TS to JS: ${error}`,
            exitCode: 6
        });
    }
}

function parseHrTimeToSeconds(
    hrTime: [number, number],
    precision: number = 2
): string {
    let seconds = (hrTime[0] + hrTime[1] / 1_000_000_000).toFixed(precision);
    return seconds;
}

function printFirstBuildWarning(): void {
    if (isInitialCompile()) {
        console.info(
            yellow(
                "\nInitial build takes a few minutes. Don't panic. Subsequent builds will be faster."
            )
        );
    }
}

function runAzleGenerate(
    fileNames: string[],
    canister_path: string,
    { root_path }: RunOptions
): Result<Rust, AzleError> {
    if (isVerboseMode()) {
        console.info('running azle_generate');
    }
    const executionResult = spawnSync(
        `${GLOBAL_AZLE_BIN_DIR}/cargo`,
        ['run', '--', fileNames.join(',')],
        {
            cwd: `${canister_path}/${root_path}/azle_generate`,
            stdio: 'pipe',
            env: {
                ...process.env,
                CARGO_TARGET_DIR: GLOBAL_AZLE_TARGET_DIR,
                CARGO_HOME: GLOBAL_AZLE_CONFIG_DIR,
                RUSTUP_HOME: GLOBAL_AZLE_CONFIG_DIR
            }
        }
    );

    const suggestion =
        'If you are unable to decipher the error above, reach out in the #typescript\nchannel of the IC Developer Community discord:\nhttps://discord.gg/5Hb6rM2QUM';

    if (executionResult.error) {
        const exitCode = (executionResult.error as any).errno ?? 13;
        return Err({
            error: `Azle encountered an error: ${executionResult.error.message}`,
            suggestion,
            exitCode
        });
    }

    if (executionResult.status !== 0) {
        const generalErrorMessage =
            "Something about your TypeScript violates Azle's requirements";
        const stdErr = executionResult.stderr.toString();
        const longErrorMessage = `The underlying cause is likely at the bottom of the following output:\n\n${stdErr}`;
        if (isVerboseMode()) {
            return Err({
                error: generalErrorMessage,
                suggestion: `${longErrorMessage}\n${suggestion}`,
                exitCode: 12
            });
        }

        const stdErrLines = stdErr.split('\n');
        const lineWhereErrorMessageStarts = stdErrLines.findIndex((line) =>
            line.startsWith("thread 'main' panicked")
        );
        const starts_with_quote_comma_and_contains_a_path_and_ends_with_line_and_column_number =
            /',\s.*\/.*\.rs:\d*:\d*/;
        const lineWhereErrorMessageEnds = stdErrLines.findIndex((line) => {
            return starts_with_quote_comma_and_contains_a_path_and_ends_with_line_and_column_number.test(
                line
            );
        });
        if (
            lineWhereErrorMessageStarts === -1 ||
            lineWhereErrorMessageEnds === -1
        ) {
            return Err({
                error: generalErrorMessage,
                suggestion: `${longErrorMessage}\n${suggestion}`,
                exitCode: 11
            });
        }
        let errorLines = stdErrLines.slice(
            lineWhereErrorMessageStarts,
            lineWhereErrorMessageEnds + 1
        );
        errorLines[0] = errorLines[0].replace(
            "thread 'main' panicked at '",
            ''
        );
        errorLines[errorLines.length - 1] = errorLines[
            errorLines.length - 1
        ].replace(
            starts_with_quote_comma_and_contains_a_path_and_ends_with_line_and_column_number,
            ''
        );

        return Err({
            error: errorLines.join('\n'),
            suggestion,
            exitCode: 12
        });
    }

    if (isVerboseMode()) {
        const rawStdErr = executionResult.stderr.toString();

        const startOfFileNamesMarker = '     Running `';
        const fileNamesStartIndex = rawStdErr.indexOf(startOfFileNamesMarker);
        const stdErrBeforeFileNames = rawStdErr.substring(
            0,
            fileNamesStartIndex
        );

        const endOfFileNamesMarker = '#AZLE_GENERATE_START';
        const fileNamesEndIndex = rawStdErr.indexOf(endOfFileNamesMarker);
        const stdErrAfterFileNames = rawStdErr.substring(
            fileNamesEndIndex + endOfFileNamesMarker.length
        );

        const stdErrWithoutFileNames =
            stdErrBeforeFileNames + stdErrAfterFileNames;
        console.log(stdErrWithoutFileNames);
        console.info('Generated unformatted lib.rs file');
    }
    return Ok(executionResult.stdout.toString());
}

function runRustFmt(
    input: Rust,
    canister_path: string,
    { root_path }: RunOptions
): Result<Rust, AzleError> {
    const executionResult = spawnSync(
        `${GLOBAL_AZLE_BIN_DIR}/rustfmt`,
        ['--edition=2018'],
        {
            cwd: `${canister_path}/${root_path}/azle_generate`,
            input,
            stdio: 'pipe',
            env: {
                ...process.env,
                CARGO_TARGET_DIR: GLOBAL_AZLE_TARGET_DIR,
                CARGO_HOME: GLOBAL_AZLE_CONFIG_DIR,
                RUSTUP_HOME: GLOBAL_AZLE_CONFIG_DIR
            }
        }
    );
    if (executionResult.status !== 0) {
        const error = executionResult.stderr.toString();
        return Err({
            error: 'Azle has experienced an internal error while trying to\n   format your generated rust canister',
            suggestion: `Please open an issue at https://github.com/demergent-labs/azle/issues/new\nincluding this message and the following error:\n\n${red(
                error
            )}`,
            exitCode: 12
        });
    }

    if (isVerboseMode()) {
        console.info('Formatted lib.rs file');
    }
    return Ok(executionResult.stdout.toString());
}

function time(
    label: string,
    mode: 'inline' | 'default',
    callback: () => void | never
): void | never {
    const startTime = process.hrtime();
    console.info(label);
    callback();
    const endTime = process.hrtime(startTime);
    const duration = parseHrTimeToSeconds(endTime);

    if (mode === 'inline') {
        const leadingNewLinesCount = (label.match(/^[\n]+/g) || [''])[0].length;
        const cursorUp = `\x1b[${1 + leadingNewLinesCount}A`;
        process.stdout.write(`${cursorUp}${label} ${dim(`${duration}s`)}\n`);
    } else {
        console.info(`\nDone in ${duration}s.`);
    }
}

function writeCodeToFileSystem(
    rootPath: string,
    canister_path: string,
    workspaceCargoToml: Toml,
    workspaceCargoLock: Toml,
    libCargoToml: Toml,
    main_js: JavaScript
) {
    fs.rmSync(`.azle`, { recursive: true, force: true });
    fs.mkdirSync(canister_path, { recursive: true });

    fs.writeFileSync(`${canister_path}/Cargo.toml`, workspaceCargoToml);
    fs.writeFileSync(`${canister_path}/Cargo.lock`, workspaceCargoLock);

    if (!fs.existsSync(`${canister_path}/${rootPath}`)) {
        fs.mkdirSync(`${canister_path}/${rootPath}`, { recursive: true });
    }

    fs.writeFileSync(`${canister_path}/${rootPath}/Cargo.toml`, libCargoToml);

    if (!fs.existsSync(`${canister_path}/${rootPath}/src`)) {
        fs.mkdirSync(`${canister_path}/${rootPath}/src`);
    }

    if (!fs.existsSync(`${canister_path}/${rootPath}/src/lib.rs`)) {
        fs.writeFileSync(`${canister_path}/${rootPath}/src/lib.rs`, '');
    }

    if (!fs.existsSync(`${canister_path}/${rootPath}/azle_vm_value_derive`)) {
        fs.mkdirSync(`${canister_path}/${rootPath}/azle_vm_value_derive`);
    }

    fsExtra.copySync(
        `${__dirname}/compiler/typescript_to_rust/azle_vm_value_derive`,
        `${canister_path}/${rootPath}/azle_vm_value_derive`
    );

    if (!fs.existsSync(`${canister_path}/${rootPath}/azle_generate`)) {
        fs.mkdirSync(`${canister_path}/${rootPath}/azle_generate`);
    }

    fsExtra.copySync(
        `${__dirname}/compiler/typescript_to_rust/azle_generate`,
        `${canister_path}/${rootPath}/azle_generate`
    );

    fs.writeFileSync(
        `${canister_path}/${rootPath}/azle_generate/src/main.js`,
        main_js
    );
}
