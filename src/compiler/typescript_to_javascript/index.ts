import * as swc from '@swc/core';
import { buildSync } from 'esbuild';
import { JavaScript, TypeScript } from '../../types';
import { Result } from '../../result';

export function compileTypeScriptToJavaScript(
    ts_path: string
): Result<JavaScript, unknown> {
    try {
        const js_bundled_and_transpiled = bundle_and_transpile_ts(`
            export { Principal } from '@dfinity/principal';
            export * from './${ts_path}';
        `);

        const main_js: JavaScript = `
            // TODO we should centralize/standardize where we add global variables to the JS, we are doing this in multiple places (i.e. the exports variable is not here, found in init/post_upgrade)
            globalThis.console = {
                ...globalThis.console,
                log: (...args) => {
                    ic.print(...args);
                }
            };

            ${js_bundled_and_transpiled}
        `;

        return { ok: main_js };
    } catch (err) {
        return { err };
    }
}

export function bundle_and_transpile_ts(ts: TypeScript): JavaScript {
    const js_bundled: JavaScript = bundle_from_string(ts);
    const js_transpiled: JavaScript = transpile(js_bundled);

    // TODO enabling strict mode is causing lots of issues
    // TODO it would be nice if I could remove strict mode code in esbuild or swc
    // TODO look into the implications of this, but since we are trying to transpile to es3 to cope with missing features in boa, I do not think we need strict mode
    const js_strict_mode_removed: JavaScript = js_transpiled.replace(
        /"use strict";/g,
        ''
    );

    return js_strict_mode_removed;
}

// TODO there is a lot of minification/transpiling etc we could do with esbuild or with swc
// TODO we need to decide which to use for what
export function bundle_from_string(ts: TypeScript): JavaScript {
    // TODO tree-shaking does not seem to work with stdin. I have learned this from sad experience
    const buildResult = buildSync({
        stdin: {
            contents: ts,
            resolveDir: process.cwd()
        },
        format: 'esm',
        bundle: true,
        treeShaking: true,
        write: false,
        logLevel: 'silent'
        // TODO tsconfig was here to attempt to set importsNotUsedAsValues to true to force Principal to always be bundled
        // TODO now we always bundle Principal for all code, but I am keeping this here in case we run into the problem elsewhere
        // tsconfig: path.join( __dirname, './esbuild-tsconfig.json') // TODO this path resolution may cause problems on non-Linux systems, beware...might not be necessary now that we are using stdin
    });

    const bundleArray = buildResult.outputFiles[0].contents;
    const bundleString = Buffer.from(bundleArray).toString('utf-8');

    return bundleString;
}

// TODO I have left the code for bundle_from_path
// TODO We might run into the situation again where we need to use bundle_from_path
// TODO there are some issues with tree-shaking and possibly some others in bundle_from_string, so I will just leave the code here for now until the project is more mature
// function bundle_from_path(ts_path: string): JavaScript {
//     const buildResult = buildSync({
//         entryPoints: [ts_path],
//         format: 'esm',
//         bundle: true,
//         treeShaking: true,
//         write: false,
//         logLevel: 'silent',
//         // TODO tsconfig was here to attempt to set importsNotUsedAsValues to true to force Principal to always be bundled
//         // TODO now we always bundle Principal for all code, but I am keeping this here in case we run into the problem elsewhere
//         // tsconfig: path.join( __dirname, './esbuild-tsconfig.json') // TODO this path resolution may cause problems on non-Linux systems, beware...might not be necessary now that we are using stdin
//     });

//     const bundleArray = buildResult.outputFiles[0].contents;
//     const bundleString = Buffer.from(bundleArray).toString('utf-8');

//     return bundleString;
// }

// TODO there is a lot of minification/transpiling etc we could do with esbuild or with swc
// TODO we need to decide which to use for what
function transpile(js: JavaScript): JavaScript {
    return swc.transformSync(js, {
        module: {
            type: 'commonjs'
        },
        jsc: {
            parser: {
                syntax: 'ecmascript'
            },
            target: 'es2015', // TODO had to change this to get generator objects natively...not sure what else will break now
            experimental: {
                cacheRoot: '/dev/null'
            },
            loose: true
        },
        minify: false // TODO keeping this off for now, enable once the project is more stable
    }).code;
}
