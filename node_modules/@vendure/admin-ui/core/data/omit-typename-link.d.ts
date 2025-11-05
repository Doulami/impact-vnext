import { ApolloLink } from '@apollo/client/core';
/**
 * The "__typename" property added by Apollo Client causes errors when posting the entity
 * back in a mutation. Therefore this link will remove all such keys before the object
 * reaches the API layer.
 *
 * See: https://github.com/apollographql/apollo-client/issues/1913#issuecomment-393721604
 */
export declare class OmitTypenameLink extends ApolloLink {
    constructor();
}
