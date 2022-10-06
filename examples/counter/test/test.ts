import { deploy, run_tests, Test } from 'azle/test';
import { createActor } from '../test/dfx_generated/counter';
import { get_tests } from './tests';

const counter_canister = createActor('rrkah-fqaaa-aaaaa-aaaaq-cai', {
    agentOptions: {
        host: 'http://127.0.0.1:8000'
    }
});

const tests: Test[] = [...deploy('counter'), ...get_tests(counter_canister)];

run_tests(tests);
