import { Principal } from '@dfinity/principal';
import { RequireExactlyOne, Variant } from './variant';

export { StableBTreeMap, InsertError } from './src/stable_b_tree_map';
export { Variant } from './variant';
export { match } from './variant';

declare var globalThis: any;

export const ic: ic = globalThis.ic ?? {};

type ic = {
    accept_message: () => void;
    // arg_data: () => any[]; // TODO: See https://github.com/demergent-labs/azle/issues/496
    arg_data_raw: () => blob;
    arg_data_raw_size: () => nat32;
    call_raw: (
        canister_id: Principal,
        method: string,
        args_raw: blob,
        payment: nat64
    ) => Promise<FinalCanisterResult<blob>>;
    call_raw128: (
        canister_id: Principal,
        method: string,
        args_raw: blob,
        payment: nat
    ) => Promise<FinalCanisterResult<blob>>;
    caller: () => Principal;
    candid_decode: (candid_encoded: blob) => string;
    candid_encode: (candid_string: string) => blob;
    canisters: {
        [canisterName: string]: <T>(canisterId: Principal) => T;
    };
    canister_balance: () => nat64;
    canister_balance128: () => nat;
    /**
     * Cancels an existing timer. Does nothing if the timer has already been canceled.
     * @param id The ID of the timer to be cancelled.
     */
    clear_timer: (id: TimerId) => void;
    data_certificate: () => Opt<blob>;
    id: () => Principal;
    method_name: () => string;
    msg_cycles_accept: (max_amount: nat64) => nat64;
    msg_cycles_accept128: (max_amount: nat) => nat;
    msg_cycles_available: () => nat64;
    msg_cycles_available128: () => nat;
    msg_cycles_refunded: () => nat64;
    msg_cycles_refunded128: () => nat;
    notify_raw: (
        canister_id: Principal,
        method: string,
        args_raw: blob,
        payment: nat
    ) => NotifyResult;
    performance_counter: (counter_type: nat32) => nat64;
    print: (...args: any) => void;
    reject: (message: string) => void;
    reject_code: () => RejectionCode;
    reject_message: () => string;
    reply: (reply: any) => void;
    reply_raw: (buf: blob) => void;
    set_certified_data: (data: blob) => void;
    /**
     * Sets callback to be executed later, after delay. Panics if `delay` + time() is more than 2^64 - 1.
     * To cancel the timer before it executes, pass the returned `TimerId` to `clear_timer`.
     * Note that timers are not persisted across canister upgrades.
     *
     * @param delay The time (in seconds) to wait before executing the provided callback.
     * @param callback the function to invoke after the specified delay has passed.
     * @returns the ID of the created timer. Used to cancel the timer.
     */
    set_timer: (
        delay: Duration,
        callback: () => void | Promise<void>
    ) => TimerId;
    /**
     * Sets callback to be executed every interval. Panics if `interval` + time() is more than 2^64 - 1.
     * To cancel the interval timer, pass the returned `TimerId` to `clear_timer`.
     * Note that timers are not persisted across canister upgrades.
     *
     * @param interval The interval (in seconds) between each callback execution.
     * @param callback the function to invoke after the specified delay has passed.
     * @returns the ID of the created timer. Used to cancel the timer.
     */
    set_timer_interval: (
        interval: Duration,
        callback: () => void | Promise<void>
    ) => TimerId;
    // stable_b_tree_map_contains_key: <Key>(memory_id: nat8, key: Key) => boolean;
    // stable_b_tree_map_get: <Key, Value>(memory_id: nat8, key: Key) => Value;
    // stable_b_tree_map_insert: <Key, Value>(
    //     memory_id: nat8,
    //     key: Key,
    //     value: Value
    // ) => InsertResult<Opt<Value>>;
    // stable_b_tree_map_is_empty: (memory_id: nat8) => boolean;
    // stable_b_tree_map_items: <Key, Value>(memory_id: nat8) => [Key, Value][];
    // stable_b_tree_map_keys: <Key>(memory_id: nat8) => Key[];
    // stable_b_tree_map_len: (memory_id: nat8) => nat64;
    // stable_b_tree_map_remove: <Key, Value>(
    //     memory_id: nat8,
    //     key: Key
    // ) => Opt<Value>;
    // stable_b_tree_map_values: <Value>(memory_id: nat8) => Value[];
    stable_bytes: () => blob;
    stable_grow: (new_pages: nat32) => StableGrowResult;
    stable_read: (offset: nat32, length: nat32) => blob;
    stable_size: () => nat32;
    stable_write: (offset: nat32, buf: blob) => void;
    stable64_grow: (new_pages: nat64) => Stable64GrowResult;
    stable64_read: (offset: nat64, length: nat64) => blob;
    stable64_size: () => nat64;
    stable64_write: (offset: nat64, buffer: blob) => void;
    time: () => nat64;
    trap: (message: string) => never;
};

/**
 * Used to mark an object as a Candid record.
 */
export type Record<T extends object> = T;
export type Opt<T> = T | null;

export type Alias<T> = T;

export type CanisterResult<T> = {
    call: () => Promise<FinalCanisterResult<T>>;
    notify: () => NotifyResult;
    cycles: (cycles: nat64) => CanisterResult<T>;
    cycles128: (cycles: nat) => CanisterResult<T>;
};

export type FinalCanisterResult<T> = RequireExactlyOne<{
    ok: T;
    err: string;
}>;

export type NotifyResult = Variant<{
    ok: null;
    err: RejectionCode;
}>;

/**
 * Type returned by the `ic.set_timer` and `ic.set_timer_interval` functions. Pass to `ic.clear_timer` to remove the timer.
 */
export type TimerId = Alias<nat64>; // TODO: Consider modeling this after the corresponding struct in Rust

/**
 * Represents a duration of time in seconds.
 */
export type Duration = Alias<nat64>; // TODO: Consider modeling this after the corresponding struct in Rust

export type int = bigint;
export type int64 = bigint;
export type int32 = number;
export type int16 = number;
export type int8 = number;

export type nat = bigint;
export type nat64 = bigint;
export type nat32 = number;
export type nat16 = number;
export type nat8 = number;

export type float32 = number;
export type float64 = number;

export type blob = Uint8Array;

export type reserved = any;
export type empty = never;

type AzleResult<T, E> = Partial<{
    ok: T;
    err: E;
}>;

// TODO working on turning the ok function into an assertion
export function attempt<T, E>(
    callback: () => AzleResult<T, E>
): AzleResult<T, E> {
    try {
        return callback();
    } catch (error) {
        return error as AzleResult<T, E>;
    }
}

// TODO type these more strictly
export type Query<T extends (...args: any[]) => any> = [Principal, string];
export type Update<T extends (...args: any[]) => any> = [Principal, string];
export type Oneway<T extends (...args: any[]) => any> = [Principal, string];

export type Func<T> = T;

export { Principal } from '@dfinity/principal';

export type RejectionCode = Variant<{
    NoError: null;
    SysFatal: null;
    SysTransient: null;
    DestinationInvalid: null;
    CanisterReject: null;
    CanisterError: null;
    Unknown: null;
}>;

export type StableMemoryError = Variant<{
    OutOfMemory: null;
    OutOfBounds: null;
}>;

export type StableGrowResult = Variant<{
    ok: nat32;
    err: StableMemoryError;
}>;

export type Stable64GrowResult = Variant<{
    ok: nat64;
    err: StableMemoryError;
}>;

/**
 * A decorator for marking query methods on external canisters. Can only be
 * used on class properties with a return type of (args: any[]) =>
 * CanisterResult<T>.
 *
 * @example
 * ```ts
 * export class SomeOtherCanister extends ExternalCanister {
 *   @query
 *   some_canister_method: (some_param: SomeParamType) => CanisterResult<SomeReturnType>;
 * }
 * ```
 */
export function query(target: any, name: string) {
    external_canister_method_decoration(target, name);
}

/**
 * A decorator for marking update methods on external canisters. Can only be
 * used on class properties with a return type of (args: any[]) =>
 * CanisterResult<T>.
 *
 * @example
 * ```ts
 * export class SomeOtherCanister extends ExternalCanister {
 *   @update
 *   some_canister_method: (some_param: SomeParamType) => CanisterResult<SomeReturnType>;
 * }
 * ```
 */
export function update(target: any, name: string) {
    external_canister_method_decoration(target, name);
}

function external_canister_method_decoration(target: any, name: string) {
    Object.defineProperty(target, name, {
        get() {
            return (...args: any[]) => {
                return {
                    call: () => {
                        return (ic as any)[
                            `_azle_call_${target.constructor.name}_${name}`
                        ](this.canister_id, args);
                    },
                    notify: () => {
                        return (ic as any)[
                            `_azle_notify_${target.constructor.name}_${name}`
                        ](this.canister_id, args);
                    },
                    cycles: (cycles: nat64) => {
                        return {
                            call: () => {
                                return (ic as any)[
                                    `_azle_call_with_payment_${target.constructor.name}_${name}`
                                ](this.canister_id, [...args, cycles]);
                            },
                            notify: () => {
                                // There is no notify_with_payment, there is only a notify_with_payment128
                                return (ic as any)[
                                    `_azle_notify_with_payment128_${target.constructor.name}_${name}`
                                ](this.canister_id, args, cycles);
                            }
                        };
                    },
                    cycles128: (cycles: nat) => {
                        return {
                            notify: () => {
                                // There is no notify_with_payment, there is only a notify_with_payment128
                                return (ic as any)[
                                    `_azle_notify_with_payment128_${target.constructor.name}_${name}`
                                ](this.canister_id, args, cycles);
                            },
                            call: () => {
                                return (ic as any)[
                                    `_azle_call_with_payment128_${target.constructor.name}_${name}`
                                ](this.canister_id, [...args, cycles]);
                            }
                        };
                    }
                };
            };
        }
    });
}

/**
 * Parent class for creating Canister definitions. To create an external
 * canister extend this class.
 * @example
 * ```ts
 * export class SomeOtherCanister extends ExternalCanister {
 *   @query
 *   some_canister_method: (some_param: SomeParamType) => CanisterResult<SomeReturnType>;
 * }
 * ```
 *
 * You can then call a method on that canister like this:
 *
 * ```ts
 * const canister = new SomeOtherCanister(
 *   Principal.fromText('ryjl3-tyaaa-aaaaa-aaaba-cai')
 * );
 *
 * const result = await canister.some_canister_method().call();
 * ```
 */
export class ExternalCanister {
    canister_id: Principal;

    constructor(canister_id: Principal) {
        this.canister_id = canister_id;
    }
}

export const $heartbeat = (options: { guard: string }) => {};
export const $init = (options: { guard: string }) => {};
export const $inspect_message = (options: { guard: string }) => {};
export const $post_upgrade = (options: { guard: string }) => {};
export const $pre_upgrade = (options: { guard: string }) => {};
export const $query = (options: { guard: string }) => {};
export const $update = (options: { guard: string }) => {};

export type Manual<T> = void;
