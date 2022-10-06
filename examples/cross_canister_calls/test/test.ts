import { deploy, run_tests, Test } from 'azle/test';
import { createActor as createActorCanister1 } from '../test/dfx_generated/canister1';
import { createActor as createActorCanister2 } from '../test/dfx_generated/canister2';
import { get_tests } from './tests';

const canister1 = createActorCanister1('rrkah-fqaaa-aaaaa-aaaaq-cai', {
    agentOptions: {
        host: 'http://127.0.0.1:8000'
    }
});

const canister2 = createActorCanister2('ryjl3-tyaaa-aaaaa-aaaba-cai', {
    agentOptions: {
        host: 'http://127.0.0.1:8000'
    }
});

const tests: Test[] = [
    ...deploy('canister1'),
    ...deploy('canister2'),
    ...get_tests(canister1, canister2)
];

run_tests(tests);
