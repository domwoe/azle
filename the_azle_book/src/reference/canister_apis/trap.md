# trap

This section is a work in progress.

Examples:

-   [cross_canister_calls](https://github.com/demergent-labs/azle/tree/main/examples/cross_canister_calls)
-   [ethereum_json_rpc](https://github.com/demergent-labs/azle/tree/main/examples/ethereum_json_rpc)
-   [http_counter](https://github.com/demergent-labs/azle/tree/main/examples/motoko_examples/http_counter)
-   [ic_api](https://github.com/demergent-labs/azle/tree/main/examples/ic_api)
-   [outgoing_http_requests](https://github.com/demergent-labs/azle/tree/main/examples/outgoing_http_requests)
-   [threshold_ecdsa](https://github.com/demergent-labs/azle/tree/main/examples/motoko_examples/threshold_ecdsa)

```typescript
import { ic, $query } from 'azle';

// traps with a message, stopping execution and discarding all state within the call
$query;
export function trap(message: string): boolean {
    ic.trap(message);

    return true;
}
```