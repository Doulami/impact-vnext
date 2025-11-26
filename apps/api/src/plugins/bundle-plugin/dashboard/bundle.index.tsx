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
                    product {
                        id
                        name
                        slug
                        featuredAsset {
                            id
                            preview
                        }
                    }
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

const searchProductsQuery = graphql(`
    query SearchProducts($term: String!, $take: Int) {
        search(input: { term: $term, take: $take, groupByProduct: true }) {
            items {
                productId
                productName
                slug
                productAsset {
                    id
                    preview
                }
            }
        }
    }
`);

const getProductWithVariantsQuery = graphql(`
    query GetProductWithVariants($id: ID!) {
        product(id: $id) {
            id
            name
            customFields {
                isBundle
            }
            variants {
                id
                name
                sku
                price
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
// Add Components Dialog
// ============================================================================

interface AddComponentsDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (variants: Array<{ variantId: string; variantName: string; productId: string; productName: string; productImage?: string; quantity: number }>) => void;
    existingVariantIds: string[];
}

function AddComponentsDialog({ isOpen, onClose, onAdd, existingVariantIds }: AddComponentsDialogProps) {
    const { _ } = useLingui();
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);
    const [selectedVariants, setSelectedVariants] = useState<Map<string, { name: string; productId: string; productName: string; productImage?: string; quantity: number }>>(new Map());
    const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

    // Auto-expand and pre-select products that have existing variants
    useEffect(() => {
        if (searchResults.length > 0 && existingVariantIds.length > 0) {
            const newExpanded = new Set<string>();
            const newSelected = new Map(selectedVariants);

            searchResults.forEach((product: any) => {
                const hasExistingVariants = product.variants.some((v: any) => existingVariantIds.includes(v.id));
                if (hasExistingVariants) {
                    newExpanded.add(product.productId);
                    product.variants.forEach((v: any) => {
                        if (existingVariantIds.includes(v.id) && !newSelected.has(v.id)) {
                            newSelected.set(v.id, {
                                name: v.name,
                                productId: product.productId,
                                productName: product.productName,
                                productImage: product.productAsset?.preview,
                                quantity: 1
                            });
                        }
                    });
                }
            });

            setExpandedProducts(newExpanded);
            setSelectedVariants(newSelected);
        }
    }, [searchResults, existingVariantIds]);

    const handleSearch = async (term: string) => {
        setSearchTerm(term);
        if (!term || term.length < 2) {
            setSearchResults([]);
            return;
        }
        try {
            const data = await api.query(searchProductsQuery, { term, take: 20 });
            const resultsWithVariants = await Promise.all(
                (data.search?.items || []).map(async (item: any) => {
                    const productData = await api.query(getProductWithVariantsQuery, { id: item.productId });
                    return {
                        ...item,
                        product: productData.product,
                        variants: productData.product?.variants || []
                    };
                })
            );
            // Filter out bundle products (bundles cannot contain other bundles)
            const nonBundleResults = resultsWithVariants.filter(item => 
                !item.product?.customFields?.isBundle
            );
            setSearchResults(nonBundleResults);
        } catch (error) {
            console.error('Failed to search:', error);
        }
    };

    const toggleProduct = (productId: string) => {
        const newExpanded = new Set(expandedProducts);
        if (newExpanded.has(productId)) {
            newExpanded.delete(productId);
        } else {
            newExpanded.add(productId);
        }
        setExpandedProducts(newExpanded);
    };

    const toggleVariant = (variantId: string, variantName: string, productId: string, productName: string, productImage?: string) => {
        const newSelected = new Map(selectedVariants);
        if (newSelected.has(variantId)) {
            newSelected.delete(variantId);
        } else {
            newSelected.set(variantId, { name: variantName, productId, productName, productImage, quantity: 1 });
        }
        setSelectedVariants(newSelected);
    };

    const toggleAllVariants = (product: any) => {
        const newSelected = new Map(selectedVariants);
        const allSelected = product.variants.every((v: any) => newSelected.has(v.id));
        
        if (allSelected) {
            // Deselect all
            product.variants.forEach((v: any) => newSelected.delete(v.id));
        } else {
            // Select all
            product.variants.forEach((v: any) => {
                if (!newSelected.has(v.id)) {
                    newSelected.set(v.id, {
                        name: v.name,
                        productId: product.productId,
                        productName: product.productName,
                        productImage: product.productAsset?.preview,
                        quantity: 1
                    });
                }
            });
        }
        setSelectedVariants(newSelected);
    };

    const updateQuantity = (variantId: string, quantity: number) => {
        const newSelected = new Map(selectedVariants);
        const variant = newSelected.get(variantId);
        if (variant) {
            newSelected.set(variantId, { ...variant, quantity });
            setSelectedVariants(newSelected);
        }
    };

    const handleAdd = () => {
        const variants = Array.from(selectedVariants.entries())
            .filter(([variantId]) => !existingVariantIds.includes(variantId)) // Only add new variants
            .map(([variantId, data]) => ({
                variantId,
                variantName: data.name,
                productId: data.productId,
                productName: data.productName,
                productImage: data.productImage,
                quantity: data.quantity
            }));
        onAdd(variants);
        setSelectedVariants(new Map());
        setSearchTerm('');
        setSearchResults([]);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between p-4 border-b">
                    <h2 className="text-lg font-semibold"><Trans>Add Bundle Components</Trans></h2>
                    <Button variant="ghost" size="sm" onClick={onClose}>×</Button>
                </div>

                <div className="p-4 border-b">
                    <Input
                        placeholder={_(/* @lingui/macro */ 'Search products...')}
                        value={searchTerm}
                        onChange={(e) => handleSearch(e.target.value)}
                        className="w-full"
                    />
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    {searchResults.length === 0 && searchTerm.length >= 2 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            <Trans>No products found</Trans>
                        </p>
                    )}
                    {searchResults.length === 0 && searchTerm.length < 2 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            <Trans>Start typing to search for products</Trans>
                        </p>
                    )}
                    {searchResults.map((product: any) => {
                        const isExpanded = expandedProducts.has(product.productId);
                        const allVariantsSelected = product.variants.every((v: any) => selectedVariants.has(v.id));
                        const someVariantsSelected = product.variants.some((v: any) => selectedVariants.has(v.id));
                        
                        return (
                            <div key={product.productId} className="border rounded-lg overflow-hidden">
                                <div className="bg-muted/30 p-3 flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={allVariantsSelected}
                                        onChange={() => toggleAllVariants(product)}
                                        className="rounded"
                                        style={{ accentColor: someVariantsSelected && !allVariantsSelected ? 'orange' : undefined }}
                                    />
                                    {product.productAsset && (
                                        <img
                                            src={product.productAsset.preview}
                                            alt={product.productName}
                                            className="w-10 h-10 object-cover rounded"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <div className="font-medium">{product.productName}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleProduct(product.productId)}
                                    >
                                        {isExpanded ? '▲' : '▼'}
                                    </Button>
                                </div>
                                {isExpanded && (
                                    <div className="p-2 space-y-1">
                                        {product.variants.map((variant: any) => (
                                            <div
                                                key={variant.id}
                                                className="flex items-center gap-3 p-2 hover:bg-muted/20 rounded"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedVariants.has(variant.id)}
                                                    onChange={() => toggleVariant(variant.id, variant.name, product.productId, product.productName, product.productAsset?.preview)}
                                                    className="rounded ml-6"
                                                    disabled={existingVariantIds.includes(variant.id)}
                                                />
                                                <div className="flex-1">
                                                    <div className="text-sm">{variant.name}</div>
                                                    <div className="text-xs text-muted-foreground">{variant.sku}</div>
                                                </div>
                                                {selectedVariants.has(variant.id) && (
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs text-muted-foreground"><Trans>Qty</Trans>:</span>
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={selectedVariants.get(variant.id)?.quantity || 1}
                                                            onChange={(e) => updateQuantity(variant.id, parseInt(e.target.value) || 1)}
                                                            className="w-16 h-7 text-center text-sm"
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                <div className="p-4 border-t flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                        <Trans>{selectedVariants.size} variant(s) selected</Trans>
                    </span>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={onClose}>
                            <Trans>Cancel</Trans>
                        </Button>
                        <Button
                            onClick={handleAdd}
                            disabled={selectedVariants.size === 0}
                        >
                            <Trans>Add to Bundle</Trans>
                        </Button>
                    </div>
                </div>
            </div>
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
    const [showAddDialog, setShowAddDialog] = useState(false);

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
            productId: it.productVariant?.product?.id,
            productName: it.productVariant?.product?.name,
            productImage: it.productVariant?.product?.featuredAsset?.preview,
            quantity: it.quantity,
            displayOrder: it.displayOrder ?? 0,
        })),
    });

    const handleAddVariants = (variants: Array<{ variantId: string; variantName: string; productId: string; productName: string; productImage?: string; quantity: number }>) => {
        const newItems = variants.map((v, index) => ({
            productVariantId: v.variantId,
            productVariantName: v.variantName,
            productId: v.productId,
            productName: v.productName,
            productImage: v.productImage,
            quantity: v.quantity,
            displayOrder: formData.items.length + index,
        }));
        setFormData({ ...formData, items: [...formData.items, ...newItems] });
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

            <AddComponentsDialog
                isOpen={showAddDialog}
                onClose={() => setShowAddDialog(false)}
                onAdd={handleAddVariants}
                existingVariantIds={formData.items.map((item: any) => item.productVariantId)}
            />
            
            <div>
                <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium"><Trans>Components</Trans></label>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAddDialog(true)}
                    >
                        <Trans>Add Components</Trans>
                    </Button>
                </div>
                
                {formData.items.length === 0 ? (
                    <p className="text-sm text-muted-foreground"><Trans>No components yet. Click "Add Components" to get started.</Trans></p>
                ) : (
                    <div className="border rounded-md space-y-0">
                        {(() => {
                            // Group items by product ID
                            const grouped: Record<string, any> = {};
                            formData.items.forEach((item: any, originalIndex: number) => {
                                const productId = item.productId || item.productVariantId;
                                if (!grouped[productId]) {
                                    grouped[productId] = {
                                        product: {
                                            id: item.productId,
                                            name: item.productName || item.productVariantName,
                                            image: item.productImage
                                        },
                                        variants: []
                                    };
                                }
                                grouped[productId].variants.push({ ...item, originalIndex });
                            });

                            return Object.values(grouped).map((group: any) => {
                                const hasMultipleVariants = group.variants.length > 1;

                                return (
                                    <div key={group.product.id} className="border-b last:border-b-0">
                                        {hasMultipleVariants && (
                                            <div className="bg-muted/30 px-3 py-2 font-medium text-sm flex items-center gap-2">
                                                {group.product.image && (
                                                    <img
                                                        src={group.product.image}
                                                        alt={group.product.name}
                                                        className="w-8 h-8 object-cover rounded"
                                                    />
                                                )}
                                                {group.product.name}
                                            </div>
                                        )}
                                        <table className="w-full text-sm">
                                            <tbody>
                                                {group.variants.map((item: any) => (
                                                    <tr key={item.originalIndex} className="border-b last:border-b-0">
                                                        <td className={`px-3 py-2 ${hasMultipleVariants ? 'pl-6' : ''}`}>
                                                            {item.productVariantName}
                                                        </td>
                                                        <td className="px-3 py-2 w-28">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs text-muted-foreground"><Trans>Qty</Trans>:</span>
                                                                <Input
                                                                    type="number"
                                                                    min="1"
                                                                    value={item.quantity}
                                                                    onChange={(e) => {
                                                                        const updatedItems = [...formData.items];
                                                                        updatedItems[item.originalIndex] = {
                                                                            ...updatedItems[item.originalIndex],
                                                                            quantity: parseInt(e.target.value, 10) || 1,
                                                                        };
                                                                        setFormData({ ...formData, items: updatedItems });
                                                                    }}
                                                                    className="h-7 text-center w-14"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 w-28">
                                                            <div className="flex items-center gap-1">
                                                                <span className="text-xs text-muted-foreground">#</span>
                                                                <Input
                                                                    type="number"
                                                                    min="0"
                                                                    value={item.displayOrder !== null && item.displayOrder !== undefined ? item.displayOrder : 0}
                                                                    onChange={(e) => {
                                                                        const updatedItems = [...formData.items];
                                                                        updatedItems[item.originalIndex] = {
                                                                            ...updatedItems[item.originalIndex],
                                                                            displayOrder: parseInt(e.target.value, 10) || 0,
                                                                        };
                                                                        setFormData({ ...formData, items: updatedItems });
                                                                    }}
                                                                    className="h-7 text-center w-14"
                                                                />
                                                            </div>
                                                        </td>
                                                        <td className="px-3 py-2 text-center w-16">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    const updatedItems = [...formData.items];
                                                                    updatedItems.splice(item.originalIndex, 1);
                                                                    setFormData({ ...formData, items: updatedItems });
                                                                }}
                                                                className="h-7 w-7 p-0 text-lg"
                                                            >
                                                                ×
                                                            </Button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                );
                            });
                        })()}
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
                                <div className="border rounded-md space-y-0">
                                    {(() => {
                                        // Group items by parent product
                                        const grouped = bundle.items.reduce((acc: any, item: any) => {
                                            const productId = item.productVariant.product.id;
                                            if (!acc[productId]) {
                                                acc[productId] = {
                                                    product: item.productVariant.product,
                                                    variants: []
                                                };
                                            }
                                            acc[productId].variants.push(item);
                                            return acc;
                                        }, {});
                                        
                                        return Object.values(grouped).map((group: any) => {
                                            const hasMultipleVariants = group.variants.length > 1;
                                            
                                            return (
                                                <div key={group.product.id} className="border-b last:border-b-0">
                                                    {hasMultipleVariants && (
                                                        <div className="bg-muted/30 px-3 py-2 font-medium text-sm flex items-center gap-2">
                                                            {group.product.featuredAsset && (
                                                                <img 
                                                                    src={group.product.featuredAsset.preview} 
                                                                    alt={group.product.name}
                                                                    className="w-8 h-8 object-cover rounded"
                                                                />
                                                            )}
                                                            {group.product.name}
                                                        </div>
                                                    )}
                                                    <table className="w-full text-sm">
                                                        <tbody>
                                                            {group.variants.map((item: any) => (
                                                                <tr key={item.id} className="border-b last:border-b-0">
                                                                    <td className={`px-3 py-2 ${hasMultipleVariants ? 'pl-6' : ''}`}>
                                                                        {item.productVariant.name}
                                                                    </td>
                                                                    <td className="px-3 py-2 text-center w-24"><Trans>Qty</Trans>: {item.quantity}</td>
                                                                    <td className="px-3 py-2 text-center w-24 text-muted-foreground">#{item.displayOrder}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            );
                                        });
                                    })()}
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
