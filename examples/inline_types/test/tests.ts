import { ok, Test } from 'azle/test';
import { execSync } from 'child_process';
import { _SERVICE } from './dfx_generated/inline_types/inline_types.did';
import { ActorSubclass } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

export function get_tests(
    inline_types_canister: ActorSubclass<_SERVICE>
): Test[] {
    return [
        {
            name: 'inline_record_return_type',
            test: async () => {
                const result =
                    await inline_types_canister.inline_record_return_type();

                return {
                    ok: result.prop1 === 'prop1' && result.prop2 === 'prop2'
                };
            }
        },
        {
            name: 'inline_record_param',
            test: async () => {
                const result = await inline_types_canister.inline_record_param({
                    prop1: 'prop1'
                });

                return {
                    ok: result === 'prop1'
                };
            }
        },
        {
            name: 'inline_variant_return_type',
            test: async () => {
                const result =
                    await inline_types_canister.inline_variant_return_type();

                return {
                    ok: 'var1' in result
                };
            }
        },
        {
            name: 'inline_record_return_type',
            test: async () => {
                const result = await inline_types_canister.inline_variant_param(
                    {
                        var1: null
                    }
                );

                return {
                    ok: 'var1' in result
                };
            }
        },
        {
            name: 'inline_variant_param',
            test: async () => {
                const result = await inline_types_canister.inline_variant_param(
                    {
                        var2: null
                    }
                );

                return {
                    ok: 'var2' in result
                };
            }
        },
        {
            name: 'record_with_inline_fields',
            test: async () => {
                const result =
                    await inline_types_canister.record_with_inline_fields();

                return {
                    ok:
                        result.id === '0' &&
                        result.job.id === '0' &&
                        result.job.title === 'Software Developer'
                };
            }
        },
        {
            name: 'variant_with_inline_fields',
            test: async () => {
                const result =
                    await inline_types_canister.variant_with_inline_fields();

                return {
                    ok: 'three' in result && result.three.id === '0'
                };
            }
        },
        {
            name: 'record_referencing_other_types_from_return_type',
            test: async () => {
                const result =
                    await inline_types_canister.record_referencing_other_types_from_return_type();

                return {
                    ok: result.prop1 === 'prop1' && result.prop2.id === '0'
                };
            }
        },
        {
            name: 'variant_referencing_other_types_from_return_type',
            test: async () => {
                const result =
                    await inline_types_canister.variant_referencing_other_types_from_return_type();

                return {
                    ok: 'prop2' in result && result.prop2.id === '0'
                };
            }
        },
        {
            name: 'record_referencing_record_from_param',
            test: async () => {
                const result =
                    await inline_types_canister.record_referencing_record_from_param(
                        {
                            test: {
                                id: '0'
                            }
                        }
                    );

                return {
                    ok: result === '0'
                };
            }
        },
        {
            name: 'record_referencing_variant_from_param',
            test: async () => {
                const result =
                    await inline_types_canister.record_referencing_variant_from_param(
                        {
                            testVariant: {
                                prop1: '0'
                            }
                        }
                    );

                return {
                    ok: result.length === 1 && result[0] === '0'
                };
            }
        },
        {
            name: 'record_referencing_variant_from_param',
            test: async () => {
                const result =
                    await inline_types_canister.record_referencing_variant_from_param(
                        {
                            testVariant: {
                                prop2: {
                                    id: '0'
                                }
                            }
                        }
                    );

                return {
                    ok: result.length === 0
                };
            }
        },
        {
            name: 'variant_referencing_record_from_param',
            test: async () => {
                const result =
                    await inline_types_canister.variant_referencing_record_from_param(
                        {
                            prop1: {
                                id: '0'
                            }
                        }
                    );

                return {
                    ok: result === undefined
                };
            }
        },
        {
            name: 'variant_referencing_variant_from_param',
            test: async () => {
                const result =
                    await inline_types_canister.variant_referencing_variant_from_param(
                        {
                            prop1: {
                                prop1: null
                            }
                        }
                    );

                return {
                    ok: result === undefined
                };
            }
        },
        {
            name: 'inline types in external canister definitions',
            test: async () => {
                const result =
                    await inline_types_canister.inline_record_return_type_as_external_canister_call();

                if (!ok(result)) {
                    return { err: result.err };
                }

                return {
                    ok: result.ok.prop1 == 'prop1' && result.ok.prop2 == 'prop2'
                };
            }
        },
        {
            name: 'inline types in funcs',
            test: async () => {
                const principal_id = 'aaaaa-aa';
                const method = 'raw_rand';
                const result = await inline_types_canister.inline_func([
                    Principal.from(principal_id),
                    method
                ]);

                return {
                    ok:
                        result[0].toString() === principal_id &&
                        result[1].toString() === method
                };
            }
        },
        {
            name: 'crazy complex inline record',
            test: async () => {
                const result = await inline_types_canister.complex({
                    primitive: 'text',
                    opt: [
                        {
                            primitive: 0n,
                            opt: ['text'],
                            vec: ['item1'],
                            record: { prop1: 'prop1' },
                            variant: { v2: null },
                            func: [Principal.from('aaaaa-aa'), 'raw_rand']
                        }
                    ],
                    vec: [
                        {
                            primitive: 0n,
                            opt: ['text'],
                            vec: ['item1'],
                            record: { prop1: 'prop1' },
                            variant: { v2: null },
                            func: [Principal.from('aaaaa-aa'), 'raw_rand']
                        }
                    ],
                    record: {
                        prop1: 'text',
                        optional: [],
                        variant: { v1: null }
                    },
                    variant: {
                        v3: {
                            prop1: 'text'
                        }
                    },
                    func: [Principal.from('aaaaa-aa'), 'raw_rand']
                });

                return {
                    ok:
                        'v3' in result.variant &&
                        result.variant.v3.prop1 == 'text' &&
                        result.opt[0]?.record.prop1 == 'prop1'
                };
            }
        },
        {
            name: 'inserting into an inline-defined StableBTreeMap',
            test: async () => {
                const result = await inline_types_canister.stable_map_insert(
                    {
                        prop1: ['test_key'],
                        prop2: { var2: { prop1: 'test_key' } },
                        prop3: [{ prop1: 0n }]
                    },
                    {
                        variant: {
                            var2: {
                                prop1: 'test_value'
                            }
                        }
                    }
                );

                if (!ok(result)) {
                    if ('ValueTooLarge' in result.err) {
                        return {
                            err: `InsertError::ValueTooLarge Expected value to be <= ${result.err.ValueTooLarge.max} bytes but received value with ${result.err.ValueTooLarge.given} bytes.`
                        };
                    } else {
                        return {
                            err: `InsertError::KeyTooLarge Expected key to be <= ${result.err.KeyTooLarge.max} bytes but received key with ${result.err.KeyTooLarge.given} bytes.`
                        };
                    }
                }

                return {
                    ok: Array.isArray(result.ok) && result.ok.length == 0
                };
            }
        },
        {
            name: 'redeploy canister',
            prep: async () => {
                execSync('dfx deploy', { stdio: 'inherit' });
            }
        },
        {
            name: 'reading from an inline-defined StableBTreeMap (after redeploy)',
            test: async () => {
                const result = await inline_types_canister.stable_map_get({
                    prop1: ['test_key'],
                    prop2: { var2: { prop1: 'test_key' } },
                    prop3: [{ prop1: 0n }]
                });

                return {
                    ok:
                        result.length != 0 &&
                        'var2' in result[0].variant &&
                        'prop1' in result[0].variant.var2 &&
                        result[0].variant.var2.prop1 === 'test_value'
                };
            }
        }
    ];
}
