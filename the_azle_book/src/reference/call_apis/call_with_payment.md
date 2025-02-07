# call with payment

This section is a work in progress.

Examples:

-   [bitcoin](https://github.com/demergent-labs/azle/tree/main/examples/bitcoin)
-   [cycles](https://github.com/demergent-labs/azle/tree/main/examples/cycles)
-   [ethereum_json_rpc](https://github.com/demergent-labs/azle/tree/main/examples/ethereum_json_rpc)
-   [management_canister](https://github.com/demergent-labs/azle/tree/main/examples/management_canister)
-   [outgoing_http_requests](https://github.com/demergent-labs/azle/tree/main/examples/outgoing_http_requests)
-   [threshold_ecdsa](https://github.com/demergent-labs/azle/tree/main/examples/motoko_examples/threshold_ecdsa)

```typescript
import { blob, ok, Principal, $update, Variant } from 'azle';
import { management_canister } from 'azle/canisters/management';

$update;
export async function execute_install_code(
    canister_id: Principal,
    wasm_module: blob
): Promise<
    Variant<{
        ok: boolean;
        err: string;
    }>
> {
    const canister_result = await management_canister
        .install_code({
            mode: {
                install: null
            },
            canister_id,
            wasm_module,
            arg: Uint8Array.from([])
        })
        .cycles(100_000_000_000n)
        .call();

    if (!ok(canister_result)) {
        return {
            err: canister_result.err
        };
    }

    return {
        ok: true
    };
}
```
