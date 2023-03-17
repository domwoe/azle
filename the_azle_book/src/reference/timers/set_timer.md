# set timer

This section is a work in progress.

Examples:

-   [timers](https://github.com/demergent-labs/azle/tree/main/examples/timers)

```typescript
import { Duration, ic, TimerId, $update } from 'azle';

$update;
export function set_timers(delay: Duration): [TimerId, TimerId] {
    const function_timer_id = ic.set_timer(delay, callback);

    const captured_value = '🚩';

    const closure_timer_id = ic.set_timer(delay, () => {
        console.log(`closure called and captured value ${captured_value}`);
    });

    return [function_timer_id, closure_timer_id];
}

function callback(): void {
    console.log('callback called');
}
```