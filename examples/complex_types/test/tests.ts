import { Test } from 'azle/test';
import { _SERVICE } from './dfx_generated/complex_types/complex_types.did';
import { ActorSubclass } from '@dfinity/agent';

export function get_tests(
    complex_types_canister: ActorSubclass<_SERVICE>
): Test[] {
    return [
        {
            name: 'getAllUsers',
            test: async () => {
                const result = await complex_types_canister.getAllUsers(0);

                return {
                    ok: result.length === 0
                };
            }
        },
        {
            name: 'createUser',
            test: async () => {
                const result = await complex_types_canister.createUser(
                    'user1',
                    0
                );

                return {
                    ok:
                        result.id === '0' &&
                        result.username === 'user1' &&
                        result.threads.length === 0 &&
                        result.posts.length === 0 &&
                        result.reactions.length === 0
                };
            }
        },
        {
            name: 'getAllUsers',
            test: async () => {
                const result = await complex_types_canister.getAllUsers(0);

                return {
                    ok:
                        result.length === 1 &&
                        result[0].id === '0' &&
                        result[0].username === 'user1' &&
                        result[0].threads.length === 0 &&
                        result[0].posts.length === 0 &&
                        result[0].reactions.length === 0
                };
            }
        }
    ];
}
