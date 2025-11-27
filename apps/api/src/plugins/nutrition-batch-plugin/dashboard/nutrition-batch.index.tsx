import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    defineDashboardExtension,
    Button,
    Input,
    DateTimeInput,
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
    RichTextInput,
    api,
} from '@vendure/dashboard';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pill, Plus, Copy, Trash2, CheckCircle, Edit, Save, X } from 'lucide-react';
import { graphql } from '@/gql';
import { Trans } from '@lingui/react/macro';

type ProductVariantBlockProps = {
    context: {
        entity?: {
            id?: string;
            name?: string;
        };
    };
};

// ============================================================================
// GraphQL Queries and Mutations
// ============================================================================

const nutritionBatchesQuery = graphql(`
    query GetNutritionBatchesForVariant($options: NutritionBatchListOptions, $variantId: ID!) {
        nutritionBatches(options: $options, variantId: $variantId) {
            items {
                id
                batchCode
                productionDate
                expiryDate
                isCurrentForWebsite
                servingSizeValue
                servingSizeUnit
                servingLabel
                servingsPerContainer
            }
            totalItems
        }
    }
`);

const nutritionBatchQuery = graphql(`
    query GetNutritionBatch($id: ID!) {
        nutritionBatch(id: $id) {
            id
            batchCode
            productionDate
            expiryDate
            isCurrentForWebsite
            servingSizeValue
            servingSizeUnit
            servingLabel
            servingsPerContainer
            notesInternal
            ingredientsText
            allergyAdviceText
            recommendedUseText
            storageAdviceText
            warningsText
            shortLabelDescription
            referenceIntakeFootnoteText
            rows {
                id
                name
                group
                unit
                valuePerServing
                valuePer100g
                referenceIntakePercentPerServing
                displayOrder
            }
        }
    }
`);

const createNutritionBatchMutation = graphql(`
    mutation CreateNutritionBatch($input: CreateNutritionBatchInput!) {
        createNutritionBatch(input: $input) {
            id
            batchCode
        }
    }
`);

const updateNutritionBatchMutation = graphql(`
    mutation UpdateNutritionBatch($id: ID!, $input: UpdateNutritionBatchInput!) {
        updateNutritionBatch(id: $id, input: $input) {
            id
            batchCode
        }
    }
`);

const deleteNutritionBatchMutation = graphql(`
    mutation DeleteNutritionBatch($id: ID!) {
        deleteNutritionBatch(id: $id) {
            result
        }
    }
`);

const setCurrentBatchMutation = graphql(`
    mutation SetCurrentNutritionBatch($batchId: ID!) {
        setCurrentNutritionBatch(batchId: $batchId) {
            id
            isCurrentForWebsite
        }
    }
`);

const duplicateBatchMutation = graphql(`
    mutation DuplicateNutritionBatch($id: ID!) {
        duplicateNutritionBatch(id: $id) {
            id
            batchCode
        }
    }
`);

const createDefaultMacrosMutation = graphql(`
    mutation CreateDefaultMacroRows($batchId: ID!) {
        createDefaultMacroRows(batchId: $batchId) {
            id
            name
            group
            unit
            valuePerServing
            valuePer100g
            referenceIntakePercentPerServing
            displayOrder
        }
    }
`);

const createNutritionBatchRowMutation = graphql(`
    mutation CreateNutritionBatchRow($batchId: ID!, $input: CreateNutritionBatchRowInput!) {
        createNutritionBatchRow(batchId: $batchId, input: $input) {
            id
            name
            group
            unit
            valuePerServing
            valuePer100g
            referenceIntakePercentPerServing
            displayOrder
        }
    }
`);

const updateNutritionBatchRowMutation = graphql(`
    mutation UpdateNutritionBatchRow($id: ID!, $input: UpdateNutritionBatchRowInput!) {
        updateNutritionBatchRow(id: $id, input: $input) {
            id
            name
            group
            unit
            valuePerServing
            valuePer100g
            referenceIntakePercentPerServing
            displayOrder
        }
    }
`);

const deleteNutritionBatchRowMutation = graphql(`
    mutation DeleteNutritionBatchRow($id: ID!) {
        deleteNutritionBatchRow(id: $id) {
            result
        }
    }
`);

// ============================================================================
// Nutrition Batch List Component
// ============================================================================

function NutritionBatchListBlock({ context }: ProductVariantBlockProps) {
    const variantId = context.entity?.id;
    const queryClient = useQueryClient();
    const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const { data, isLoading } = useQuery({
        queryKey: ['nutrition-batches', variantId],
        queryFn: () => api.query(nutritionBatchesQuery, { variantId: variantId || '', options: { take: 100 } }),
        enabled: !!variantId,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.mutate(deleteNutritionBatchMutation, { id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nutrition-batches', variantId] });
        },
    });

    const setCurrentMutation = useMutation({
        mutationFn: (batchId: string) => api.mutate(setCurrentBatchMutation, { batchId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nutrition-batches', variantId] });
        },
    });

    const duplicateMutation = useMutation({
        mutationFn: (id: string) => api.mutate(duplicateBatchMutation, { id }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nutrition-batches', variantId] });
        },
    });

    const batches = data?.nutritionBatches?.items || [];

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle><Trans>Batches & Nutrition</Trans></CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground"><Trans>Loading...</Trans></p>
                </CardContent>
            </Card>
        );
    }

    if (selectedBatchId || isCreating) {
        return (
            <NutritionBatchFormBlock
                context={context}
                batchId={isCreating ? null : selectedBatchId}
                onClose={() => {
                    setSelectedBatchId(null);
                    setIsCreating(false);
                }}
            />
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="font-semibold flex items-center gap-2">
                    <Pill className="w-5 h-5" />
                    <Trans>Batches & Nutrition</Trans>
                </span>
                <Button onClick={() => setIsCreating(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    <Trans>Create Batch</Trans>
                </Button>
            </div>
            <div>
                {batches.length === 0 ? (
                    <p className="text-sm text-muted-foreground"><Trans>No batches yet. Click "Create Batch" to get started.</Trans></p>
                ) : (
                    <div className="border rounded-md">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b bg-muted/50">
                                    <th className="px-3 py-2 text-left font-medium"><Trans>Batch Code</Trans></th>
                                    <th className="px-3 py-2 text-left font-medium"><Trans>Production Date</Trans></th>
                                    <th className="px-3 py-2 text-left font-medium"><Trans>Expiry Date</Trans></th>
                                    <th className="px-3 py-2 text-left font-medium"><Trans>Serving Size</Trans></th>
                                    <th className="px-3 py-2 text-center font-medium"><Trans>Current</Trans></th>
                                    <th className="px-3 py-2 text-center font-medium"><Trans>Actions</Trans></th>
                                </tr>
                            </thead>
                            <tbody>
                                {batches.map((batch: any) => (
                                    <tr key={batch.id} className="border-b last:border-b-0 hover:bg-muted/30">
                                        <td className="px-3 py-2">
                                            <button
                                                onClick={() => setSelectedBatchId(batch.id)}
                                                className="text-blue-600 hover:underline font-medium"
                                            >
                                                {batch.batchCode}
                                            </button>
                                            {batch.isCurrentForWebsite && (
                                                <Badge variant="success" className="ml-2"><Trans>Current</Trans></Badge>
                                            )}
                                        </td>
                                        <td className="px-3 py-2">
                                            {batch.productionDate ? new Date(batch.productionDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-3 py-2">
                                            {batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-3 py-2">
                                            {batch.servingSizeValue} {batch.servingSizeUnit}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            {!batch.isCurrentForWebsite && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setCurrentMutation.mutate(batch.id)}
                                                    disabled={setCurrentMutation.isPending}
                                                >
                                                    <Trans>Set as Current</Trans>
                                                </Button>
                                            )}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <div className="flex items-center justify-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => duplicateMutation.mutate(batch.id)}
                                                    disabled={duplicateMutation.isPending}
                                                    title="Duplicate"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            title="Delete"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-destructive" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle><Trans>Delete Batch?</Trans></AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                <Trans id="Are you sure you want to delete batch {batchCode}? This action cannot be undone." values={{ batchCode: batch.batchCode }} />
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel><Trans>Cancel</Trans></AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => deleteMutation.mutate(batch.id)}
                                                            >
                                                                <Trans>Delete</Trans>
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// Nutrition Batch Form Component
// ============================================================================

type FormBlockProps = ProductVariantBlockProps & {
    batchId: string | null;
    onClose: () => void;
};

function NutritionBatchFormBlock({ context, batchId, onClose }: FormBlockProps) {
    const variantId = context.entity?.id;
    const queryClient = useQueryClient();
    const isNew = !batchId;

    // Form state
    const [formData, setFormData] = useState<any>({
        batchCode: '',
        productionDate: '',
        expiryDate: '',
        isCurrentForWebsite: false,
        servingSizeValue: 0,
        servingSizeUnit: 'g',
        servingLabel: '',
        servingsPerContainer: null,
        notesInternal: '',
        ingredientsText: '',
        allergyAdviceText: '',
        recommendedUseText: '',
        storageAdviceText: '',
        warningsText: '',
        shortLabelDescription: '',
        referenceIntakeFootnoteText: '',
        rows: [],
    });
    const [deletedRowIds, setDeletedRowIds] = useState<string[]>([]);

    const { data: batchData, isLoading, error: batchError } = useQuery({
        queryKey: ['nutrition-batch', batchId],
        queryFn: () => api.query(nutritionBatchQuery, { id: batchId! }),
        enabled: !isNew,
    });

    // Populate form when data loads
    useEffect(() => {
        if (batchData?.nutritionBatch) {
            const batch = batchData.nutritionBatch;
            setFormData({
                batchCode: batch.batchCode || '',
                productionDate: batch.productionDate || '',
                expiryDate: batch.expiryDate || '',
                isCurrentForWebsite: batch.isCurrentForWebsite || false,
                servingSizeValue: batch.servingSizeValue || 0,
                servingSizeUnit: batch.servingSizeUnit || 'g',
                servingLabel: parseLocaleString(batch.servingLabel) || '',
                servingsPerContainer: batch.servingsPerContainer || null,
                notesInternal: batch.notesInternal || '',
                ingredientsText: parseLocaleString(batch.ingredientsText) || '',
                allergyAdviceText: parseLocaleString(batch.allergyAdviceText) || '',
                recommendedUseText: parseLocaleString(batch.recommendedUseText) || '',
                storageAdviceText: parseLocaleString(batch.storageAdviceText) || '',
                warningsText: parseLocaleString(batch.warningsText) || '',
                shortLabelDescription: parseLocaleString(batch.shortLabelDescription) || '',
                referenceIntakeFootnoteText: parseLocaleString(batch.referenceIntakeFootnoteText) || '',
                rows: batch.rows || [],
            });
        }
    }, [batchData]);

    useEffect(() => {
        if (batchError) {
            console.error('Failed to load batch:', batchError);
        }
        if (!isLoading && !batchError && !isNew && !batchData?.nutritionBatch) {
            console.error('Batch data is null for batchId:', batchId);
        }
    }, [batchError, isLoading, batchData, isNew, batchId]);

    const createMutation = useMutation({
        mutationFn: (input: any) => api.mutate(createNutritionBatchMutation, { input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nutrition-batches', variantId] });
            onClose();
        },
        onError: (error: any) => {
            console.error('Create mutation error:', error);
        },
    });

    const updateMutation = useMutation({
        mutationFn: (input: any) => api.mutate(updateNutritionBatchMutation, { id: batchId!, input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nutrition-batches', variantId] });
            queryClient.invalidateQueries({ queryKey: ['nutrition-batch', batchId] });
            onClose();
        },
        onError: (error: any) => {
            console.error('Update mutation error:', error);
        },
    });

    const addDefaultMacrosMutation = useMutation({
        mutationFn: () => api.mutate(createDefaultMacrosMutation, { batchId: batchId! }),
        onSuccess: (data) => {
            // Add new rows to formData
            setFormData((prev: any) => ({
                ...prev,
                rows: [...prev.rows, ...(data.createDefaultMacroRows || [])]
            }));
        },
    });

    const deleteRowMutation = useMutation({
        mutationFn: (rowId: string) => api.mutate(deleteNutritionBatchRowMutation, { id: rowId }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['nutrition-batch', batchId] });
        },
    });

    // Helper functions for row management
    const addNewRow = () => {
        const newRow = {
            id: `new-${Date.now()}`,
            name: '',
            group: 'macro',
            unit: 'g',
            valuePerServing: null,
            valuePer100g: null,
            referenceIntakePercentPerServing: null,
            displayOrder: formData.rows.length
        };
        setFormData({ ...formData, rows: [...formData.rows, newRow] });
    };

    const updateRow = (index: number, field: string, value: any) => {
        const updatedRows = [...formData.rows];
        updatedRows[index] = { ...updatedRows[index], [field]: value };
        setFormData({ ...formData, rows: updatedRows });
    };

    const deleteRow = (index: number) => {
        const row = formData.rows[index];
        const updatedRows = formData.rows.filter((_: any, i: number) => i !== index);
        setFormData({ ...formData, rows: updatedRows });
        
        // Track row for deletion on save (only for existing rows)
        if (row.id && !row.id.toString().startsWith('new-')) {
            setDeletedRowIds([...deletedRowIds, row.id]);
        }
    };

    const handleSave = async () => {
        const input = {
            productVariantId: variantId,
            batchCode: formData.batchCode,
            productionDate: formData.productionDate || null,
            expiryDate: formData.expiryDate || null,
            isCurrentForWebsite: formData.isCurrentForWebsite,
            servingSizeValue: parseFloat(formData.servingSizeValue),
            servingSizeUnit: formData.servingSizeUnit,
            servingsPerContainer: formData.servingsPerContainer ? parseInt(formData.servingsPerContainer) : null,
            notesInternal: formData.notesInternal || null,
            translations: buildTranslations(formData)
        };

        if (isNew) {
            createMutation.mutate(input);
        } else {
            // Save batch info
            const { productVariantId, ...updateInput } = input;
            updateMutation.mutate(updateInput);
            
            // Save nutrition rows (only for existing batches)
            await saveNutritionRows();
        }
    };

    const saveNutritionRows = async () => {
        if (isNew) return;
        
        // Delete rows that were marked for deletion
        for (const rowId of deletedRowIds) {
            await deleteRowMutation.mutateAsync(rowId);
        }
        setDeletedRowIds([]);
        
        // Filter out empty rows (no name or all values null)
        const validRows = formData.rows.filter((row: any) => {
            return row.name && row.name.trim() !== '';
        });

        // Save each row
        for (const row of validRows) {
            const rowInput = {
                translations: [
                    {
                        languageCode: 'en',
                        name: row.name
                    }
                ],
                group: row.group,
                unit: row.unit,
                valuePerServing: row.valuePerServing ? parseFloat(row.valuePerServing) : null,
                valuePer100g: row.valuePer100g ? parseFloat(row.valuePer100g) : null,
                referenceIntakePercentPerServing: row.referenceIntakePercentPerServing ? parseFloat(row.referenceIntakePercentPerServing) : null,
                displayOrder: row.displayOrder || 0
            };

            if (row.id && row.id.toString().startsWith('new-')) {
                // Create new row
                await api.mutate(createNutritionBatchRowMutation, {
                    batchId: batchId!,
                    input: rowInput
                });
            } else if (row.id) {
                // Update existing row
                await api.mutate(updateNutritionBatchRowMutation, {
                    id: row.id,
                    input: rowInput
                });
            }
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground"><Trans>Loading batch data...</Trans></p>
            </div>
        );
    }

    if (batchError) {
        return (
            <div className="space-y-4">
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    <Trans>Error loading batch data. Check console for details.</Trans>
                </div>
                <Button variant="outline" onClick={onClose}>
                    <Trans>Back to List</Trans>
                </Button>
            </div>
        );
    }

    if (!isNew && !batchData?.nutritionBatch) {
        return (
            <div className="space-y-4">
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    <Trans>Batch not found.</Trans>
                </div>
                <Button variant="outline" onClick={onClose}>
                    <Trans>Back to List</Trans>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <span className="font-semibold">
                    {isNew ? <Trans>Create Nutrition Batch</Trans> : `Edit Batch: ${formData.batchCode}`}
                </span>
                <Button variant="outline" onClick={onClose}>
                    <X className="w-4 h-4 mr-2" />
                    <Trans>Cancel</Trans>
                </Button>
            </div>
            <div className="space-y-6">
                {/* Batch Info Section */}
                <Card>
                    <CardHeader>
                        <CardTitle><Trans>Batch Information</Trans></CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium block mb-1"><Trans>Batch Code</Trans> *</label>
                                <Input
                                    value={formData.batchCode}
                                    onChange={(e) => setFormData({ ...formData, batchCode: e.target.value })}
                                    placeholder="e.g. BATCH-2024-001"
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={formData.isCurrentForWebsite}
                                    onCheckedChange={(checked) => setFormData({ ...formData, isCurrentForWebsite: checked })}
                                />
                                <label className="text-sm font-medium"><Trans>Set as Current for Website</Trans></label>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium block mb-1"><Trans>Production Date</Trans></label>
                                <DateTimeInput
                                    value={formData.productionDate}
                                    onChange={(value) => setFormData({ ...formData, productionDate: value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1"><Trans>Expiry Date</Trans></label>
                                <DateTimeInput
                                    value={formData.expiryDate}
                                    onChange={(value) => setFormData({ ...formData, expiryDate: value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Serving Size Section */}
                <Card>
                    <CardHeader>
                        <CardTitle><Trans>Serving Information</Trans></CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-sm font-medium block mb-1"><Trans>Serving Size</Trans> *</label>
                                <Input
                                    type="number"
                                    value={formData.servingSizeValue}
                                    onChange={(e) => setFormData({ ...formData, servingSizeValue: e.target.value })}
                                    min="0"
                                    step="0.01"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1"><Trans>Unit</Trans></label>
                                <Select
                                    value={formData.servingSizeUnit}
                                    onValueChange={(value) => setFormData({ ...formData, servingSizeUnit: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="g">g</SelectItem>
                                        <SelectItem value="ml">ml</SelectItem>
                                        <SelectItem value="mg">mg</SelectItem>
                                        <SelectItem value="mcg">mcg</SelectItem>
                                        <SelectItem value="oz">oz</SelectItem>
                                        <SelectItem value="lb">lb</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1"><Trans>Servings Per Container</Trans></label>
                                <Input
                                    type="number"
                                    value={formData.servingsPerContainer || ''}
                                    onChange={(e) => setFormData({ ...formData, servingsPerContainer: e.target.value })}
                                    min="0"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-1"><Trans>Serving Label</Trans></label>
                            <Input
                                value={formData.servingLabel}
                                onChange={(e) => setFormData({ ...formData, servingLabel: e.target.value })}
                                placeholder="e.g. 60 g (1.5 scoops)"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Regulatory Texts Section */}
                <Card>
                    <CardHeader>
                        <CardTitle><Trans>Regulatory & Marketing Texts</Trans></CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <label className="text-sm font-medium block mb-1"><Trans>Short Description</Trans></label>
                            <RichTextInput
                                value={formData.shortLabelDescription}
                                onChange={(value) => setFormData({ ...formData, shortLabelDescription: value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium block mb-1"><Trans>Ingredients</Trans></label>
                                <RichTextInput
                                    value={formData.ingredientsText}
                                    onChange={(value) => setFormData({ ...formData, ingredientsText: value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1"><Trans>Allergy Advice</Trans></label>
                                <RichTextInput
                                    value={formData.allergyAdviceText}
                                    onChange={(value) => setFormData({ ...formData, allergyAdviceText: value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium block mb-1"><Trans>Recommended Use</Trans></label>
                                <RichTextInput
                                    value={formData.recommendedUseText}
                                    onChange={(value) => setFormData({ ...formData, recommendedUseText: value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1"><Trans>Storage Advice</Trans></label>
                                <RichTextInput
                                    value={formData.storageAdviceText}
                                    onChange={(value) => setFormData({ ...formData, storageAdviceText: value })}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-medium block mb-1"><Trans>Warnings</Trans></label>
                                <RichTextInput
                                    value={formData.warningsText}
                                    onChange={(value) => setFormData({ ...formData, warningsText: value })}
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium block mb-1"><Trans>Reference Intake Footnote</Trans></label>
                                <RichTextInput
                                    value={formData.referenceIntakeFootnoteText}
                                    onChange={(value) => setFormData({ ...formData, referenceIntakeFootnoteText: value })}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Internal Notes */}
                <Card>
                    <CardHeader>
                        <CardTitle><Trans>Internal Notes</Trans></CardTitle>
                    </CardHeader>
                    <CardContent>
                        <RichTextInput
                            value={formData.notesInternal}
                            onChange={(value) => setFormData({ ...formData, notesInternal: value })}
                        />
                    </CardContent>
                </Card>

                {/* Nutrition Rows Table */}
                {!isNew && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle><Trans>Nutrition Table</Trans></CardTitle>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={addNewRow}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        <Trans>Add Row</Trans>
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => addDefaultMacrosMutation.mutate()}
                                        disabled={addDefaultMacrosMutation.isPending}
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        <Trans>Add Default Macros</Trans>
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {formData.rows && formData.rows.length > 0 ? (
                                <div className="border rounded-md overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="px-2 py-2 text-left font-medium w-48"><Trans>Nutrient</Trans></th>
                                                <th className="px-2 py-2 text-left font-medium w-32"><Trans>Group</Trans></th>
                                                <th className="px-2 py-2 text-left font-medium w-24"><Trans>Per Serving</Trans></th>
                                                <th className="px-2 py-2 text-left font-medium w-24"><Trans>Per 100g</Trans></th>
                                                <th className="px-2 py-2 text-left font-medium w-24"><Trans>RI %</Trans></th>
                                                <th className="px-2 py-2 text-left font-medium w-24"><Trans>Unit</Trans></th>
                                                <th className="px-2 py-2 text-center font-medium w-16"><Trans>Actions</Trans></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.rows.map((row: any, index: number) => (
                                                <tr key={row.id} className="border-b last:border-b-0">
                                                    <td className="px-2 py-2">
                                                        <Input
                                                            value={row.name || ''}
                                                            onChange={(e) => updateRow(index, 'name', e.target.value)}
                                                            placeholder="Nutrient name"
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Select
                                                            value={row.group || 'macro'}
                                                            onValueChange={(value) => updateRow(index, 'group', value)}
                                                        >
                                                            <SelectTrigger className="h-8">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="macro"><Trans>Macro</Trans></SelectItem>
                                                                <SelectItem value="vitamin"><Trans>Vitamin</Trans></SelectItem>
                                                                <SelectItem value="mineral"><Trans>Mineral</Trans></SelectItem>
                                                                <SelectItem value="amino"><Trans>Amino</Trans></SelectItem>
                                                                <SelectItem value="other"><Trans>Other</Trans></SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={row.valuePerServing || ''}
                                                            onChange={(e) => updateRow(index, 'valuePerServing', e.target.value)}
                                                            placeholder="0"
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={row.valuePer100g || ''}
                                                            onChange={(e) => updateRow(index, 'valuePer100g', e.target.value)}
                                                            placeholder="0"
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={row.referenceIntakePercentPerServing || ''}
                                                            onChange={(e) => updateRow(index, 'referenceIntakePercentPerServing', e.target.value)}
                                                            placeholder="0"
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <Input
                                                            value={row.unit || ''}
                                                            onChange={(e) => updateRow(index, 'unit', e.target.value)}
                                                            placeholder="g"
                                                            className="h-8"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-2 text-center">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => deleteRow(index)}
                                                            className="h-8 w-8 p-0"
                                                        >
                                                            <Trash2 className="w-4 h-4 text-destructive" />
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground">
                                    <Trans>No nutrition data yet. Click "Add Row" or "Add Default Macros" to get started.</Trans>
                                </p>
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Save/Cancel buttons at bottom */}
                <div className="space-y-2">
                    {(createMutation.isError || updateMutation.isError) && (
                        <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                            <Trans>Error saving batch. Please check console for details.</Trans>
                        </div>
                    )}
                    <div className="flex gap-2 pt-4 border-t">
                        <Button
                            onClick={handleSave}
                            disabled={!formData.batchCode || !formData.servingSizeValue || createMutation.isPending || updateMutation.isPending}
                        >
                            {createMutation.isPending || updateMutation.isPending ? <Trans>Saving...</Trans> : <Trans>Save</Trans>}
                        </Button>
                        <Button variant="outline" onClick={onClose}>
                            <Trans>Cancel</Trans>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================================================
// Helper Functions
// ============================================================================

function parseLocaleString(value: any): string {
    if (!value) return '';
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return parsed.en || '';
        } catch {
            return value;
        }
    }
    return value.en || '';
}

// Convert simple string to translations array format for Vendure's Translatable pattern
function toTranslationsArray(value: string, fieldName: string): any[] {
    if (!value || value.trim() === '') return [];
    return [
        {
            languageCode: 'en',
            [fieldName]: value
        }
    ];
}

// Build translations object with all translatable fields
function buildTranslations(formData: any): any[] {
    const translations: any = {
        languageCode: 'en',
        servingLabel: formData.servingLabel || '',
        ingredientsText: formData.ingredientsText || '',
        allergyAdviceText: formData.allergyAdviceText || '',
        recommendedUseText: formData.recommendedUseText || '',
        storageAdviceText: formData.storageAdviceText || '',
        warningsText: formData.warningsText || '',
        shortLabelDescription: formData.shortLabelDescription || '',
        referenceIntakeFootnoteText: formData.referenceIntakeFootnoteText || ''
    };
    return [translations];
}

// ============================================================================
// Dashboard Extension Registration
// ============================================================================

export default defineDashboardExtension({
    pageBlocks: [
        {
            id: 'nutrition-batches',
            location: {
                pageId: 'product-variant-detail',
                column: 'main',
                position: {
                    blockId: 'price-and-tax',
                    order: 'before',
                },
            },
            component: NutritionBatchListBlock,
        },
    ],
});
