import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    defineDashboardExtension,
    Button,
    Input,
    DateTimeInput,
    MoneyInput,
    Badge,
    Switch,
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
    AlertDialog,
    AlertDialogTrigger,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
    api,
    useLocalFormat,
} from '@vendure/dashboard';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, CheckCircle, AlertCircle, Settings } from 'lucide-react';
import { graphql } from '@/gql';
import { Trans, useLingui } from '@lingui/react/macro';
// import './bundle-dashboard.css'; // Temporarily disabled

type ProductBlockProps = {
    context: {
        entity?: {
            id?: string;
            name?: string;
            customFields?: {
                isBundle?: boolean;
                bundleId?: string;
            };
        };
    };
};

// ============================================================================
// GraphQL Queries and Mutations
// ============================================================================

const productQuery = graphql(`
    query GetProductForBundle($id: ID!) {
        product(id: $id) {
            id
            name
            variants {
                id
                name
            }
            customFields {
                isBundle
                bundleId
            }
        }
    }
`);

const updateProductMutation = graphql(`
    mutation UpdateProductBundle($input: UpdateProductInput!) {
        updateProduct(input: $input) {
            id
            name
            customFields {
                isBundle
                bundleId
            }
        }
    }
`);

const bundleQuery = graphql(`
    query GetBundle($id: ID!) {
        bundle(id: $id) {
            id
            name
            description
            status
            discountType
            fixedPrice
            percentOff
            validFrom
            validTo
            bundleCap
            allowExternalPromos
            effectivePrice
            totalSavings
            bundleVirtualStock
            isExpired
            isBroken
            items {
                id
                productVariant {
                    id
                    name
                    sku
                }
                quantity
                displayOrder
            }
        }
    }
`);

const createBundleMutation = graphql(`
    mutation CreateBundle($input: CreateBundleInput!) {
        createBundle(input: $input) {
            id
            name
            status
        }
    }
`);

const updateBundleMutation = graphql(`
    mutation UpdateBundle($input: UpdateBundleInput!) {
        updateBundle(input: $input) {
            id
            name
            status
        }
    }
`);

const publishBundleMutation = graphql(`
    mutation PublishBundle($id: ID!) {
        publishBundle(id: $id) {
            id
            status
        }
    }
`);


const activateProductAsBundleMutation = graphql(`
    mutation ActivateProductAsBundle($productId: ID!) {
        activateProductAsBundle(productId: $productId) {
            success
            message
        }
    }
`);

const removeProductBundleMutation = graphql(`
    mutation RemoveProductBundle($productId: ID!, $bundleId: ID!) {
        removeProductBundle(productId: $productId, bundleId: $bundleId) {
            success
            message
        }
    }
`);

const bundleConfigQuery = graphql(`
    query GetBundleConfig {
        bundleConfig {
            siteWidePromosAffectBundles
            maxCumulativeDiscountPctForBundleChildren
        }
    }
`);

const updateBundleConfigMutation = graphql(`
    mutation UpdateBundleConfig($input: UpdateBundleConfigInput!) {
        updateBundleConfig(input: $input) {
            siteWidePromosAffectBundles
            maxCumulativeDiscountPctForBundleChildren
        }
    }
`);

const searchProductVariantsQuery = graphql(`
    query SearchProductVariants($term: String!, $take: Int) {
        search(input: { term: $term, take: $take, groupByProduct: false }) {
            items {
                productVariantId
                productVariantName
                sku
                price {
                    ... on SinglePrice {
                        value
                    }
                }
            }
        }
    }
`);

// ============================================================================
// Bundle Status Block (Product Detail - Side Column)
// ============================================================================

function BundleStatusBlock({ context }: ProductBlockProps) {
    const productId = context.entity?.id;
    const isBundle = context.entity?.customFields?.isBundle || false;
    const bundleId = context.entity?.customFields?.bundleId;
    const [isActivating, setIsActivating] = useState(false);
    const queryClient = useQueryClient();

    const { data: productData } = useQuery({
        queryKey: ['product-bundle-status', productId],
        queryFn: () => api.query(productQuery, { id: productId || '' }),
        enabled: !!productId,
    });

    const { data: bundleData } = useQuery({
        queryKey: ['bundle-detail', bundleId],
        queryFn: () => api.query(bundleQuery, { id: bundleId || '' }),
        enabled: !!bundleId,
    });

    const activateBundleMutation = useMutation({
        mutationFn: (productId: string) =>
            api.mutate(activateProductAsBundleMutation, { productId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product-bundle-status', productId] });
            setIsActivating(false);
        },
    });

    const removeBundleMutation = useMutation({
        mutationFn: ({ productId, bundleId }: { productId: string; bundleId: string }) =>
            api.mutate(removeProductBundleMutation, {
                productId,
                bundleId
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['product-bundle-status', productId] });
            queryClient.invalidateQueries({ queryKey: ['bundle-detail', bundleId] });
        },
    });

    const handleActivate = async () => {
        if (!productId || !product) return;
        
        // Check if product has more than one variant
        const variantCount = product.variants?.length || 0;
        if (variantCount > 1) {
            alert('Cannot activate bundle: Product has multiple variants. Bundles can only be created for products with a single variant.');
            return;
        }
        
        setIsActivating(true);
        try {
            await activateBundleMutation.mutateAsync(productId);
        } catch (error) {
            console.error('Failed to activate bundle:', error);
            setIsActivating(false);
        }
    };

    const handleRemove = async () => {
        if (!productId || !bundleId) return;
        try {
            await removeBundleMutation.mutateAsync({ 
                productId, 
                bundleId
            });
        } catch (error) {
            console.error('Failed to remove bundle configuration:', error);
        }
    };

    if (!productId) {
        return null;
    }

    const product = productData?.product;
    const bundle = bundleData?.bundle;

    return (
        <div className="space-y-4">
                {!isBundle && !product?.customFields?.isBundle ? (
                    <>
                        <p className="text-sm text-muted-foreground">
                            <Trans>This product is not a bundle.</Trans>
                        </p>
                        <Button
                            onClick={handleActivate}
                            disabled={isActivating}
                            className="w-full"
                        >
                            {isActivating ? <Trans>Configuring...</Trans> : <Trans>Configure as Bundle</Trans>}
                        </Button>
                    </>
                ) : !bundleId && !product?.customFields?.bundleId ? (
                    <div className="flex items-start gap-2 text-amber-600">
                        <AlertCircle className="h-4 w-4 mt-0.5" />
                        <div>
                            <p className="text-sm font-medium"><Trans>Configure Bundle</Trans></p>
                            <p className="text-xs"><Trans>Bundle activated but not configured yet</Trans></p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div className={`flex items-center gap-2 ${
                                bundle?.status === 'ACTIVE' ? 'text-green-600' :
                                bundle?.status === 'DRAFT' ? 'text-amber-600' :
                                'text-gray-600'
                            }`}>
                                <CheckCircle className="h-4 w-4" />
                                <span className="text-sm font-medium"><Trans>This product is a bundle</Trans></span>
                            </div>
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={removeBundleMutation.isPending}
                                        className="text-xs"
                                    >
                                        <Trans>Remove Bundle</Trans>
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle><Trans>Remove bundle configuration?</Trans></AlertDialogTitle>
                                        <AlertDialogDescription>
                                            <Trans>This action cannot be undone. This will permanently delete the bundle configuration. The product itself will remain unchanged.</Trans>
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel><Trans>Cancel</Trans></AlertDialogCancel>
                                        <AlertDialogAction onClick={handleRemove} disabled={removeBundleMutation.isPending}>
                                            {removeBundleMutation.isPending ? <Trans>Removing...</Trans> : <Trans>Remove Bundle</Trans>}
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                        
                        {bundle && (
                            <>
                                <div className="space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground"><Trans>Status</Trans></span>
                                        <span className={`font-medium ${
                                            bundle.status === 'ACTIVE' ? 'text-green-600' :
                                            bundle.status === 'DRAFT' ? 'text-amber-600' :
                                            'text-gray-600'
                                        }`}>
                                            {bundle.status}
                                        </span>
                                    </div>
                                    {bundle.status === 'ACTIVE' && bundle.isExpired && (
                                        <div className="flex items-center gap-1 text-xs text-red-600">
                                            <AlertCircle className="h-3 w-3" />
                                            <span><Trans>Expired</Trans></span>
                                        </div>
                                    )}
                                    {bundle.status === 'ACTIVE' && bundle.isBroken && (
                                        <div className="flex items-center gap-1 text-xs text-amber-600">
                                            <AlertCircle className="h-3 w-3" />
                                            <span><Trans>Broken (missing components)</Trans></span>
                                        </div>
                                    )}
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground"><Trans>Components</Trans></span>
                                        <span className="font-medium">{bundle.items?.length || 0}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-muted-foreground"><Trans>Discount Type</Trans></span>
                                        <span className="font-medium">
                                            {bundle.discountType === 'fixed' ? <Trans>Fixed Price</Trans> : <Trans>Percentage Off</Trans>}
                                        </span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                )}
        </div>
    );
}

// ============================================================================
// Bundle Form Component
// ============================================================================

interface BundleFormProps {
    bundle?: any;
    productName?: string;
    onSave: (data: any) => Promise<void>;
    onCancel: () => void;
    isSaving: boolean;
}

function BundleForm({ bundle, productName, onSave, onCancel, isSaving }: BundleFormProps) {
    const { _ } = useLingui();
    const [searchTerm, setSearchTerm] = useState<{[key: number]: string}>({});
    const [searchResults, setSearchResults] = useState<{[key: number]: any[]}>({});
    const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);

    const [formData, setFormData] = useState({
        discountType: bundle?.discountType || 'fixed',
        fixedPrice: bundle?.fixedPrice ? bundle.fixedPrice / 100 : 0,
        percentOff: bundle?.percentOff || 0,
        validFrom: bundle?.validFrom ? new Date(bundle.validFrom).toISOString().slice(0,16) : '',
        validTo: bundle?.validTo ? new Date(bundle.validTo).toISOString().slice(0,16) : '',
        bundleCap: bundle?.bundleCap ?? undefined as number | undefined,
        allowExternalPromos: bundle?.allowExternalPromos ?? false,
        items: (bundle?.items || []).map((it: any) => ({
            productVariantId: it.productVariant?.id ?? it.productVariantId,
            productVariantName: it.productVariant?.name ?? it.productVariantName,
            quantity: it.quantity,
            displayOrder: it.displayOrder ?? 0,
        })),
    });

    const handleSearchVariant = async (term: string, index: number) => {
        setSearchTerm({ ...searchTerm, [index]: term });
        setActiveSearchIndex(index);

        if (!term || term.length < 2) {
            setSearchResults({ ...searchResults, [index]: [] });
            return;
        }

        try {
            const data = await api.query(searchProductVariantsQuery, { term, take: 10 });
            setSearchResults({ ...searchResults, [index]: data.search?.items || [] });
        } catch (error) {
            console.error('Failed to search variants:', error);
        }
    };

    const handleSelectVariant = (variant: any, index: number) => {
        const items = [...formData.items];
        items[index] = {
            ...items[index],
            productVariantId: variant.productVariantId,
            productVariantName: variant.productVariantName,
        };
        setFormData({ ...formData, items });
        setSearchTerm({ ...searchTerm, [index]: variant.productVariantName });
        setSearchResults({ ...searchResults, [index]: [] });
        setActiveSearchIndex(null);
    };

    const handleSubmit = async () => {
        const submitData: any = {
            discountType: formData.discountType,
            allowExternalPromos: formData.allowExternalPromos,
            validFrom: formData.validFrom ? new Date(formData.validFrom).toISOString() : null,
            validTo: formData.validTo ? new Date(formData.validTo).toISOString() : null,
            bundleCap: typeof formData.bundleCap === 'number' ? formData.bundleCap : null,
        };

        if (formData.discountType === 'fixed') {
            submitData.fixedPrice = Math.round(formData.fixedPrice * 100);
        } else {
            submitData.percentOff = formData.percentOff;
        }

        if (formData.items.length > 0) {
            submitData.items = formData.items.map((item: any) => ({
                productVariantId: item.productVariantId,
                quantity: Number(item.quantity) || 1,
                displayOrder: Number(item.displayOrder) || 0,
            }));
        }

        await onSave(submitData);
    };

    return (
        <div className="space-y-4">
            <div>
                <label className="text-sm font-medium block mb-1"><Trans>Discount Type</Trans></label>
                <Select value={formData.discountType} onValueChange={(value) => setFormData({ ...formData, discountType: value })}>
                    <SelectTrigger className="w-full">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="fixed"><Trans>Fixed Price</Trans></SelectItem>
                        <SelectItem value="percent"><Trans>Percentage Off</Trans></SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {formData.discountType === 'fixed' ? (
                <div>
                    <label className="text-sm font-medium block mb-1"><Trans>Fixed Price</Trans></label>
                    <p className="text-xs text-muted-foreground mb-2">
                        <Trans>Price applied at order; item prices prorated</Trans>
                    </p>
                    <MoneyInput
                        value={Math.round(formData.fixedPrice * 100)}
                        onChange={(value: number) => setFormData({ ...formData, fixedPrice: value / 100 })}
                        currency="USD"
                        name="fixedPrice"
                    />
                </div>
            ) : (
                <div>
                    <label className="text-sm font-medium block mb-1"><Trans>Percentage Off (%)</Trans></label>
                    <p className="text-xs text-muted-foreground mb-2">
                        <Trans>Discount percentage applied to component total</Trans>
                    </p>
                    <div className="relative">
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={formData.percentOff}
                            onChange={(e) => setFormData({ ...formData, percentOff: parseFloat(e.target.value) || 0 })}
                            className="pr-7"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
                    </div>
                </div>
            )}

            <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-3"><Trans>Availability</Trans></h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-sm font-medium block mb-1"><Trans>Available From</Trans></label>
                        <p className="text-xs text-muted-foreground mb-2">
                            <Trans>Leave empty for immediate availability</Trans>
                        </p>
                        <DateTimeInput
                            value={formData.validFrom ? new Date(formData.validFrom).toISOString() : ''}
                            onChange={(value: string) => setFormData({ ...formData, validFrom: value ? new Date(value).toISOString().slice(0, 16) : '' })}
                            name="validFrom"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium block mb-1"><Trans>Available Until</Trans></label>
                        <p className="text-xs text-muted-foreground mb-2">
                            <Trans>Leave empty for permanent availability</Trans>
                        </p>
                        <DateTimeInput
                            value={formData.validTo ? new Date(formData.validTo).toISOString() : ''}
                            onChange={(value: string) => setFormData({ ...formData, validTo: value ? new Date(value).toISOString().slice(0, 16) : '' })}
                            name="validTo"
                        />
                    </div>
                </div>
            </div>

            <div>
                <label className="text-sm font-medium block mb-1"><Trans>Bundle Cap</Trans></label>
                <p className="text-xs text-muted-foreground mb-2">
                    <Trans>Maximum bundles that can be sold (leave empty for unlimited)</Trans>
                </p>
                <Input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={formData.bundleCap !== null && formData.bundleCap !== undefined ? formData.bundleCap : ''}
                    onChange={(e) => setFormData({ ...formData, bundleCap: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                />
            </div>

            <div className="border rounded-lg p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <label htmlFor="allowExternalPromos" className="text-sm font-medium">
                        <Trans>Allow External Promotions</Trans>
                    </label>
                    <Switch
                        checked={formData.allowExternalPromos}
                        onCheckedChange={(checked) => setFormData({ ...formData, allowExternalPromos: checked })}
                    />
                </div>
                <p className="text-xs text-muted-foreground">
                    <Trans>Whether external promotion codes/coupons can be applied to this bundle</Trans>
                </p>
                <div className="text-xs space-y-1 mt-2">
                    <p className={formData.allowExternalPromos ? 'text-muted-foreground' : 'text-green-600 font-medium'}>
                        <strong><Trans>OFF</Trans>:</strong> <Trans>Promotion codes and coupons will NOT apply to this bundle (prevents double-discounting)</Trans>
                    </p>
                    <p className={formData.allowExternalPromos ? 'text-amber-600 font-medium' : 'text-muted-foreground'}>
                        <strong><Trans>ON</Trans>:</strong> <Trans>External promotions can apply (bundle discount + promo discount)</Trans>
                    </p>
                </div>
            </div>

            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium"><Trans>Components</Trans></label>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setFormData({
                            ...formData,
                            items: [...formData.items, { productVariantId: '', quantity: 1, displayOrder: (formData.items?.length || 0) }],
                        })}
                    >
                        <Trans>Add Component</Trans>
                    </Button>
                </div>
                {formData.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground"><Trans>No components yet</Trans></p>
                ) : (
                    <div className="border rounded-md overflow-visible">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 border-b">
                                <tr>
                                    <th className="px-3 py-2 text-left font-medium"><Trans>Variant ID</Trans></th>
                                    <th className="px-3 py-2 text-center font-medium w-24"><Trans>Quantity</Trans></th>
                                    <th className="px-3 py-2 text-center font-medium w-24"><Trans>Order</Trans></th>
                                    <th className="px-3 py-2 text-center font-medium w-20"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {formData.items.map((item: any, index: number) => (
                                    <tr key={index} className="border-b last:border-b-0">
                                        <td className="px-3 py-2 relative">
                                            <div className="relative">
                                                <Input
                                                    placeholder={_(/* @lingui/macro */ 'Search variant...')}
                                                    value={searchTerm[index] || item.productVariantName || ''}
                                                    onChange={(e) => handleSearchVariant(e.target.value, index)}
                                                    onFocus={() => setActiveSearchIndex(index)}
                                                    onBlur={() => setTimeout(() => setActiveSearchIndex(null), 200)}
                                                    className="h-8"
                                                />
                                                {activeSearchIndex === index && searchResults[index]?.length > 0 && (
                                                    <div className="absolute z-[9999] mt-1 left-0 right-0 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                                                        {searchResults[index].map((variant: any, vIndex: number) => (
                                                            <button
                                                                key={vIndex}
                                                                type="button"
                                                                onClick={() => handleSelectVariant(variant, index)}
                                                                className="w-full text-left px-3 py-2 hover:bg-gray-100 border-b last:border-b-0"
                                                            >
                                                                <div className="font-medium text-sm">{variant.productVariantName}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    <Trans>SKU</Trans>: {variant.sku} • ${(variant.price?.value || 0) / 100}
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-3 py-2">
                                            <Input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => {
                                                    const items = [...formData.items];
                                                    items[index] = { ...items[index], quantity: parseInt(e.target.value, 10) || 1 };
                                                    setFormData({ ...formData, items });
                                                }}
                                                className="h-8 text-center"
                                            />
                                        </td>
                                        <td className="px-3 py-2">
                                            <Input
                                                type="number"
                                                min="0"
                                                value={item.displayOrder !== null && item.displayOrder !== undefined ? item.displayOrder : 0}
                                                onChange={(e) => {
                                                    const items = [...formData.items];
                                                    items[index] = { ...items[index], displayOrder: parseInt(e.target.value, 10) || 0 };
                                                    setFormData({ ...formData, items });
                                                }}
                                                className="h-8 text-center"
                                            />
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const items = [...formData.items];
                                                    items.splice(index, 1);
                                                    setFormData({ ...formData, items });
                                                }}
                                                className="h-8 w-8 p-0"
                                            >
                                                ×
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="flex gap-2 pt-4">
                <Button
                    onClick={handleSubmit}
                    disabled={isSaving || formData.items.length === 0 || formData.items.some(item => !item.productVariantId)}
                >
                    {isSaving ? <Trans>Saving...</Trans> : <Trans>Save Bundle</Trans>}
                </Button>
                <Button variant="outline" onClick={onCancel} disabled={isSaving}>
                    <Trans>Cancel</Trans>
                </Button>
            </div>
        </div>
    );
}

// ============================================================================
// Bundle Configuration Block (Product Detail - Main Column)
// ============================================================================

function BundleConfigurationBlock({ context }: ProductBlockProps) {
    const productId = context.entity?.id;
    const bundleId = context.entity?.customFields?.bundleId;
    const isBundle = context.entity?.customFields?.isBundle;
    const [isEditing, setIsEditing] = useState(false);
    const queryClient = useQueryClient();

    // Only show this block if product is configured as a bundle
    if (!isBundle) {
        return null;
    }

    const { data, isLoading } = useQuery({
        queryKey: ['bundle-detail', bundleId],
        queryFn: () => api.query(bundleQuery, { id: bundleId || '' }),
        enabled: !!bundleId,
    });

    const createMutation = useMutation({
        mutationFn: (input: any) => api.mutate(createBundleMutation, { input }),
        onSuccess: (data: any) => {
            const newId = data?.createBundle?.id;
            if (newId) {
                queryClient.invalidateQueries({ queryKey: ['bundle-detail', newId] });
            }
            queryClient.invalidateQueries({ queryKey: ['product-bundle-status', productId] });
            setIsEditing(false);
        },
    });

    const updateMutation = useMutation({
        mutationFn: (input: any) => api.mutate(updateBundleMutation, { input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bundle-detail', bundleId] });
            setIsEditing(false);
        },
    });

    const publishMutation = useMutation({
        mutationFn: (id: string) => api.mutate(publishBundleMutation, { id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bundle-detail', bundleId] });
        },
    });

    const bundle = data?.bundle;

    if (isLoading) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground"><Trans>Loading bundle data...</Trans></p>
            </div>
        );
    }

    if (!bundleId && !bundle) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    <Trans>No bundle configuration found. Create a bundle for this product.</Trans>
                </p>
                <Button
                    onClick={() => setIsEditing(true)}
                    variant="outline"
                    className="w-full"
                >
                    <Trans>Create Bundle</Trans>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="font-semibold"><Trans>Bundle Configuration</Trans></span>
                {!isEditing && bundle && (
                    <div className="flex items-center gap-2">
                        <Badge variant={
                            bundle.status === 'ACTIVE' ? 'success' :
                            bundle.status === 'DRAFT' ? 'warning' :
                            'default'
                        }>
                            {bundle.status}
                        </Badge>
                        {bundle.status === 'DRAFT' && (
                            <Button
                                size="sm"
                                onClick={() => publishMutation.mutate(bundle.id)}
                                disabled={publishMutation.isPending}
                            >
                                {publishMutation.isPending ? <Trans>Publishing...</Trans> : <Trans>Publish</Trans>}
                            </Button>
                        )}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(true)}
                        >
                            <Trans>Edit</Trans>
                        </Button>
                    </div>
                )}
            </div>
            <div>
                {!isEditing && bundle ? (
                    <div className="space-y-4">
                        <div>
                            <div className="text-xs text-muted-foreground mb-2"><Trans>Discount Configuration</Trans></div>
                            <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                    <span><Trans>Type</Trans>:</span>
                                    <span className="font-medium">
                                        {bundle.discountType === 'fixed' ? <Trans>Fixed Price</Trans> : <Trans>Percentage Off</Trans>}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span><Trans>Value</Trans>:</span>
                                    <span className="font-medium">
                                        {bundle.discountType === 'fixed' 
                                            ? `$${((bundle.fixedPrice || 0) / 100).toFixed(2)}`
                                            : `${bundle.percentOff}%`
                                        }
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="text-xs text-muted-foreground mb-2">
                                <Trans>Components ({bundle.items?.length || 0})</Trans>
                            </div>
                            {bundle.items && bundle.items.length > 0 ? (
                                <div className="border rounded-md">
                                    <table className="w-full text-sm">
                                        <thead className="bg-muted/50 border-b">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-medium"><Trans>Variant</Trans></th>
                                                <th className="px-3 py-2 text-center font-medium"><Trans>Quantity</Trans></th>
                                                <th className="px-3 py-2 text-center font-medium"><Trans>Order</Trans></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {bundle.items.map((item) => (
                                                <tr key={item.id} className="border-b last:border-b-0">
                                                    <td className="px-3 py-2">{item.productVariant.name}</td>
                                                    <td className="px-3 py-2 text-center">{item.quantity}</td>
                                                    <td className="px-3 py-2 text-center">{item.displayOrder}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground"><Trans>No components</Trans></p>
                            )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                            <div>
                                <div className="text-xs text-muted-foreground"><Trans>Valid From</Trans></div>
                                <div className="text-sm">{bundle.validFrom ? new Date(bundle.validFrom).toLocaleDateString() : '-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground"><Trans>Valid To</Trans></div>
                                <div className="text-sm">{bundle.validTo ? new Date(bundle.validTo).toLocaleDateString() : '-'}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground"><Trans>Bundle Cap</Trans></div>
                                <div className="text-sm">{bundle.bundleCap ?? <Trans>Unlimited</Trans>}</div>
                            </div>
                            <div>
                                <div className="text-xs text-muted-foreground"><Trans>External Promos</Trans></div>
                                <div className="text-sm">{bundle.allowExternalPromos ? <Trans>Allowed</Trans> : <Trans>Not Allowed</Trans>}</div>
                            </div>
                        </div>

                        <div className="pt-2 border-t">
                            <div className="flex justify-between text-sm">
                                <span className="font-medium"><Trans>Effective Price</Trans></span>
                                <span className="font-bold">${((bundle.effectivePrice || 0) / 100).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm text-green-600">
                                <span><Trans>Total Savings</Trans></span>
                                <span>${((bundle.totalSavings || 0) / 100).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <BundleForm
                        bundle={bundle}
                        productName={context.entity?.name}
                        onSave={async (bundleData) => {
                            if (bundle) {
                                await updateMutation.mutateAsync({
                                    id: bundle.id,
                                    ...bundleData,
                                });
                            } else {
                                await createMutation.mutateAsync({
                                    name: context.entity?.name || 'Bundle',
                                    shellProductId: context.entity?.id || '',
                                    ...bundleData,
                                });
                            }
                        }}
                        onCancel={() => setIsEditing(false)}
                        isSaving={updateMutation.isPending || createMutation.isPending}
                    />
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Bundle Settings Block (Global Settings)
// ============================================================================

function BundleSettingsBlock() {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);

    const { data, isLoading, error } = useQuery({
        queryKey: ['bundleConfig'],
        queryFn: () => api.query(bundleConfigQuery, {}),
    });

    const updateSettingsMutation = useMutation({
        mutationFn: (input: {
            siteWidePromosAffectBundles?: string;
            maxCumulativeDiscountPctForBundleChildren?: number;
        }) => api.mutate(updateBundleConfigMutation, { input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['bundleConfig'] });
            setIsEditing(false);
        },
    });

    const [formData, setFormData] = useState({
        siteWidePromosAffectBundles: 'Exclude',
        maxCumulativeDiscountPctForBundleChildren: 0.5,
    });

    // Update form data when settings load
    useEffect(() => {
        if (data?.bundleConfig) {
            setFormData({
                siteWidePromosAffectBundles: data.bundleConfig.siteWidePromosAffectBundles,
                maxCumulativeDiscountPctForBundleChildren:
                    data.bundleConfig.maxCumulativeDiscountPctForBundleChildren,
            });
        }
    }, [data]);

    const handleSave = async () => {
        await updateSettingsMutation.mutateAsync(formData);
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground"><Trans>Loading settings...</Trans></p>
            </div>
        );
    }

    if (error || !data?.bundleConfig) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-destructive"><Trans>Failed to load bundle settings</Trans></p>
            </div>
        );
    }

    const settings = data.bundleConfig;

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-semibold">
                    <Settings className="h-5 w-5" />
                    <Trans>Bundle Settings</Trans>
                </span>
                {!isEditing && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setFormData({
                                siteWidePromosAffectBundles: settings.siteWidePromosAffectBundles,
                                maxCumulativeDiscountPctForBundleChildren:
                                    settings.maxCumulativeDiscountPctForBundleChildren,
                            });
                            setIsEditing(true);
                        }}
                    >
                        <Trans>Edit</Trans>
                    </Button>
                )}
            </div>
            <div>
                {!isEditing ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium"><Trans>Site-wide Promotions</Trans></span>
                            <span
                                className={`text-sm ${
                                    settings.siteWidePromosAffectBundles === 'Allow'
                                        ? 'text-amber-600'
                                        : 'text-green-600'
                                }`}
                            >
                                {settings.siteWidePromosAffectBundles}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium"><Trans>Max Cumulative Discount</Trans></span>
                            <span className="text-sm">
                                {(settings.maxCumulativeDiscountPctForBundleChildren * 100).toFixed(0)}%
                            </span>
                        </div>
                        <div className="pt-3 border-t text-xs text-muted-foreground">
                            <p className="mb-2">
                                <strong>Site-wide Promotions:</strong> Controls whether external
                                promotions and coupon codes can apply to bundle items.
                            </p>
                            <p>
                                <strong>Max Cumulative Discount:</strong> Maximum combined discount
                                percentage allowed on bundle child items.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div>
                            <label className="text-sm font-medium block mb-2">
                                <Trans>Site-wide Promotions Affect Bundles</Trans>
                            </label>
                            <select
                                className="w-full p-2 border rounded"
                                value={formData.siteWidePromosAffectBundles}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        siteWidePromosAffectBundles: e.target.value,
                                    })
                                }
                            >
                                <option value="Exclude"><Trans>Exclude (Safe)</Trans></option>
                                <option value="Allow"><Trans>Allow (Risky)</Trans></option>
                            </select>
                            <p className="text-xs text-muted-foreground mt-1">
                                <Trans>Whether external promotions can apply to bundles</Trans>
                            </p>
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-2">
                                <Trans>Max Cumulative Discount (%)</Trans>
                            </label>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="1"
                                value={formData.maxCumulativeDiscountPctForBundleChildren}
                                onChange={(e) =>
                                    setFormData({
                                        ...formData,
                                        maxCumulativeDiscountPctForBundleChildren: parseFloat(
                                            e.target.value
                                        ),
                                    })
                                }
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                <Trans>Enter as decimal (e.g., 0.50 for 50%)</Trans>
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleSave}
                                disabled={updateSettingsMutation.isPending}
                            >
                                {updateSettingsMutation.isPending ? <Trans>Saving...</Trans> : <Trans>Save</Trans>}
                            </Button>
                            <Button variant="outline" onClick={() => setIsEditing(false)}>
                                <Trans>Cancel</Trans>
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Dashboard Extension Definition
// ============================================================================

export default defineDashboardExtension({
    translations: {
        en: () => import('./i18n/en'),
        fr: () => import('./i18n/fr'),
    },
    pageBlocks: [
        {
            id: 'bundle-status',
            location: {
                pageId: 'product-detail',
                column: 'side',
                position: {
                    blockId: 'enabled-toggle',
                    order: 'after',
                },
            },
            component: BundleStatusBlock,
        },
        {
            id: 'bundle-configuration',
            location: {
                pageId: 'product-detail',
                column: 'main',
                position: {
                    blockId: 'product-variants-table',
                    order: 'before',
                },
            },
            component: BundleConfigurationBlock,
            shouldRender: (context) => !!context.entity?.customFields?.isBundle,
        },
        {
            id: 'bundle-settings',
            location: {
                pageId: 'global-settings',
                column: 'main',
                position: {
                    blockId: 'main-form',
                    order: 'after',
                },
            },
            component: BundleSettingsBlock,
        },
    ],
});
