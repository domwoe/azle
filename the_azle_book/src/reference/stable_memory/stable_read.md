# stable read

This section is a work in progress.

Examples:

-   [stable_memory](https://github.com/demergent-labs/azle/tree/main/examples/stable_memory)

```typescript
import { blob, ic, nat32, $query } from 'azle';

$query;
export function stable_read(offset: nat32, length: nat32): blob {
    return ic.stable_read(offset, length);
}
```
