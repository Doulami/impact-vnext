import { CrudPermissionDefinition } from '@vendure/core';

/**
 * Custom permission for Bundle management.
 * 
 * This creates the following permissions:
 * - ReadBundle: View bundle internal fields
 * - CreateBundle: Create new bundles
 * - UpdateBundle: Modify bundle configuration
 * - DeleteBundle: Delete bundles
 * 
 * These can be assigned to specific roles in the Admin UI.
 */
export const bundlePermission = new CrudPermissionDefinition('Bundle');
