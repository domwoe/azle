// TODO let's add more examples here, really test it out

import { Opt, $query, Record } from 'azle';

type Html = Record<{
    head: Opt<Head>;
}>;

type Head = Record<{
    elements: Element[];
}>;

type Element = Record<{
    id: string;
}>;

$query;
export function get_html(): Html {
    return {
        head: null
    };
}

$query;
export function get_head(): Opt<Head> {
    return {
        elements: []
    };
}

$query;
export function get_head_with_elements(): Opt<Head> {
    return {
        elements: [
            {
                id: '0'
            }
        ]
    };
}

$query;
export function get_element(element: Opt<Opt<Element>>): Opt<Opt<Element>> {
    return element;
}
