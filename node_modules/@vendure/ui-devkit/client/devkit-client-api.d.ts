import { ActiveRouteData, NotificationMessage, WatchQueryFetchPolicy } from '@vendure/common/lib/extension-host-types';
import { Observable } from 'rxjs';
/**
 * @description
 * Set the [window.postMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
 * `targetOrigin`. The Vendure ui-devkit uses the postMessage API to
 * enable cross-frame and cross-origin communication between the ui extension code and the Admin UI
 * app. The `targetOrigin` is a security feature intended to provide control over where messages are sent.
 *
 * @docsCategory ui-devkit
 * @docsPage UiDevkitClient
 */
export declare function setTargetOrigin(value: string): void;
/**
 * @description
 * Retrieves information about the current route of the host application, since it is not possible
 * to otherwise get this information from within the child iframe.
 *
 * @example
 * ```ts
 * import { getActivatedRoute } from '\@vendure/ui-devkit';
 *
 * const route = await getActivatedRoute();
 * const slug = route.params.slug;
 * ```
 * @docsCategory ui-devkit
 * @docsPage UiDevkitClient
 */
export declare function getActivatedRoute(): Promise<ActiveRouteData>;
/**
 * @description
 * Perform a GraphQL query and returns either an Observable or a Promise of the result.
 *
 * @example
 * ```ts
 * import { graphQlQuery } from '\@vendure/ui-devkit';
 *
 * const productList = await graphQlQuery(`
 *   query GetProducts($skip: Int, $take: Int) {
 *       products(options: { skip: $skip, take: $take }) {
 *           items { id, name, enabled },
 *           totalItems
 *       }
 *   }`, {
 *     skip: 0,
 *     take: 10,
 *   }).then(data => data.products);
 * ```
 *
 * @docsCategory ui-devkit
 * @docsPage UiDevkitClient
 */
export declare function graphQlQuery<T, V extends {
    [key: string]: any;
}>(document: string, variables?: {
    [key: string]: any;
}, fetchPolicy?: WatchQueryFetchPolicy): {
    then: Promise<T>['then'];
    stream: Observable<T>;
};
/**
 * @description
 * Perform a GraphQL mutation and returns either an Observable or a Promise of the result.
 *
 * @example
 * ```ts
 * import { graphQlMutation } from '\@vendure/ui-devkit';
 *
 * const disableProduct = (id: string) => {
 *   return graphQlMutation(`
 *     mutation DisableProduct($id: ID!) {
 *       updateProduct(input: { id: $id, enabled: false }) {
 *         id
 *         enabled
 *       }
 *     }`, { id })
 *     .then(data => data.updateProduct)
 * }
 * ```
 *
 * @docsCategory ui-devkit
 * @docsPage UiDevkitClient
 */
export declare function graphQlMutation<T, V extends {
    [key: string]: any;
}>(document: string, variables?: {
    [key: string]: any;
}): {
    then: Promise<T>['then'];
    stream: Observable<T>;
};
/**
 * @description
 * Display a toast notification.
 *
 * @example
 * ```ts
 * import { notify } from '\@vendure/ui-devkit';
 *
 * notify({
 *   message: 'Updated Product',
 *   type: 'success'
 * });
 * ```
 *
 * @docsCategory ui-devkit
 * @docsPage UiDevkitClient
 */
export declare function notify(options: NotificationMessage['data']): void;
