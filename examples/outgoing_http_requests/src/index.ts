import { ic, Manual, match, Principal, $query, $update } from 'azle';
import {
    HttpResponse,
    HttpTransformArgs,
    management_canister
} from 'azle/canisters/management';

$update;
export async function xkcd(): Promise<HttpResponse> {
    const max_response_bytes = 1_000n;

    // TODO this is just a hueristic for cost, might change when the feature is officially released: https://forum.dfinity.org/t/enable-canisters-to-make-http-s-requests/9670/130
    const cycle_cost_base = 400_000_000n;
    const cycle_cost_per_byte = 300_000n; // TODO not sure on this exact cost
    const cycle_cost_total =
        cycle_cost_base + cycle_cost_per_byte * max_response_bytes;

    const http_result = await management_canister
        .http_request({
            url: `https://xkcd.com/642/info.0.json`,
            max_response_bytes,
            method: {
                get: null
            },
            headers: [],
            body: null,
            transform: {
                function: [ic.id(), 'xkcd_transform'],
                context: Uint8Array.from([])
            }
        })
        .cycles(cycle_cost_total)
        .call();

    return match(http_result, {
        ok: (http_response) => http_response,
        err: (err) => ic.trap(http_result.err ?? 'http_result had an error')
    });
}

$update;
export async function xkcd_raw(): Promise<Manual<HttpResponse>> {
    const max_response_bytes = 1_000n;

    // TODO this is just a hueristic for cost, might change when the feature is officially released: https://forum.dfinity.org/t/enable-canisters-to-make-http-s-requests/9670/130
    const cycle_cost_base = 400_000_000n;
    const cycle_cost_per_byte = 300_000n; // TODO not sure on this exact cost
    const cycle_cost_total =
        cycle_cost_base + cycle_cost_per_byte * max_response_bytes;

    const http_result = await ic.call_raw(
        Principal.fromText('aaaaa-aa'),
        'http_request',
        ic.candid_encode(`
            (
                record {
                    url = "https://xkcd.com/642/info.0.json";
                    max_response_bytes = ${max_response_bytes} : nat64;
                    method = variant { get };
                    headers = vec {};
                    body = null;
                    transform = opt record { function = record { principal "${ic
                        .id()
                        .toString()}"; "xkcd_transform" }; context = vec {} };
                }
            )
        `),
        cycle_cost_total
    );

    match(http_result, {
        ok: (http_response) => ic.reply_raw(http_response),
        err: (err) => ic.trap(err ?? 'http_result had an error')
    });
}

$query;
export function xkcd_transform(args: HttpTransformArgs): HttpResponse {
    return {
        ...args.response,
        headers: []
    };
}
