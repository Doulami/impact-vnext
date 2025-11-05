import { CustomFieldConfig } from '../../common/generated-types';
/**
 * Transforms any custom field "relation" type inputs into the corresponding `<name>Id` format,
 * as expected by the server.
 */
export declare function transformRelationCustomFieldInputs<T extends {
    input?: Record<string, any> | Array<Record<string, any>>;
} & Record<string, any> = any>(variables: T, customFieldConfig: CustomFieldConfig[]): T;
