import { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { Test } from 'azle/test';
import { _SERVICE } from './dfx_generated/func_types/func_types.did';

export function get_tests(
    func_types_canister: ActorSubclass<_SERVICE>
): Test[] {
    return [
        {
            name: 'get_stable_func',
            test: async () => {
                const result = await func_types_canister.get_stable_func();

                return {
                    ok:
                        result[0].toText() === 'aaaaa-aa' &&
                        result[1] === 'start_canister'
                };
            }
        },
        {
            name: 'get_null_func',
            test: async () => {
                const result = await func_types_canister.null_func_param([
                    Principal.fromText('rrkah-fqaaa-aaaaa-aaaaq-cai'),
                    'return_null'
                ]);

                return {
                    ok:
                        result[0].toText() === 'rrkah-fqaaa-aaaaa-aaaaq-cai' &&
                        result[1] === 'return_null'
                };
            }
        },
        {
            name: 'basic_func_param',
            test: async () => {
                const result = await func_types_canister.basic_func_param([
                    Principal.fromText('aaaaa-aa'),
                    'create_canister'
                ]);

                return {
                    ok:
                        result[0].toText() === 'aaaaa-aa' &&
                        result[1] === 'create_canister'
                };
            }
        },
        {
            name: 'basic_func_param_array',
            test: async () => {
                const result = await func_types_canister.basic_func_param_array(
                    [
                        [Principal.fromText('aaaaa-aa'), 'create_canister'],
                        [Principal.fromText('aaaaa-aa'), 'update_settings'],
                        [Principal.fromText('aaaaa-aa'), 'install_code']
                    ]
                );

                return {
                    ok:
                        result[0][0].toText() === 'aaaaa-aa' &&
                        result[0][1] === 'create_canister' &&
                        result[1][0].toText() === 'aaaaa-aa' &&
                        result[1][1] === 'update_settings' &&
                        result[2][0].toText() === 'aaaaa-aa' &&
                        result[2][1] === 'install_code'
                };
            }
        },
        {
            name: 'basic_func_return_type',
            test: async () => {
                const result =
                    await func_types_canister.basic_func_return_type();

                return {
                    ok:
                        result[0].toText() === 'aaaaa-aa' &&
                        result[1] === 'create_canister'
                };
            }
        },
        {
            name: 'basic_func_return_type_array',
            test: async () => {
                const result =
                    await func_types_canister.basic_func_return_type_array();

                return {
                    ok:
                        result[0][0].toText() === 'aaaaa-aa' &&
                        result[0][1] === 'create_canister' &&
                        result[1][0].toText() === 'aaaaa-aa' &&
                        result[1][1] === 'update_settings' &&
                        result[2][0].toText() === 'aaaaa-aa' &&
                        result[2][1] === 'install_code'
                };
            }
        },
        {
            name: 'complex_func_param',
            test: async () => {
                const result = await func_types_canister.complex_func_param([
                    Principal.fromText('aaaaa-aa'),
                    'stop_canister'
                ]);

                return {
                    ok:
                        result[0].toText() === 'aaaaa-aa' &&
                        result[1] === 'stop_canister'
                };
            }
        },
        {
            name: 'complex_func_return_type',
            test: async () => {
                const result =
                    await func_types_canister.complex_func_return_type();

                return {
                    ok:
                        result[0].toText() === 'aaaaa-aa' &&
                        result[1] === 'stop_canister'
                };
            }
        },
        {
            name: 'get_notifier_from_notifiers_canister',
            test: async () => {
                // TODO agent-js seems to be creating incorrect types here: https://github.com/dfinity/agent-js/issues/583
                const result: any =
                    await func_types_canister.get_notifier_from_notifiers_canister();

                return {
                    ok:
                        'ok' in result &&
                        result.ok[0].toText() ===
                            'ryjl3-tyaaa-aaaaa-aaaba-cai' &&
                        result.ok[1] === 'notify'
                };
            }
        }
    ];
}
