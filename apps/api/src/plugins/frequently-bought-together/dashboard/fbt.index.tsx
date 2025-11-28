import {
    defineDashboardExtension,
    Button,
    Input,
    Switch,
    Slider,
    api,
} from '@vendure/dashboard';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Play } from 'lucide-react';
import { graphql } from '@/gql';
import { Trans } from '@lingui/react/macro';

// GraphQL Queries
const settingsQuery = graphql(`
    query GetAssociationSettings {
        associationSettings {
            id
            enabled
            jobSchedule
            analysisTimeWindowDays
            minCooccurrenceThreshold
            minScoreThreshold
            maxRecommendationsPerProduct
            frequencyWeight
            recencyWeight
            valueWeight
            pdpRelatedSection
            pdpUnderAddToCart
            cartPage
            checkoutPage
            fallbackToRelatedProducts
            lastCalculation
            lastCalculationDurationMs
            lastCalculationAssociationsCount
        }
    }
`);

const updateSettingsMutation = graphql(`
    mutation UpdateAssociationSettings($input: UpdateAssociationSettingsInput!) {
        updateAssociationSettings(input: $input) {
            id
            enabled
            lastCalculation
        }
    }
`);

const triggerCalculationMutation = graphql(`
    mutation TriggerAssociationCalculation {
        triggerAssociationCalculation {
            success
            associationsCount
            durationMs
            message
        }
    }
`);

const statsQuery = graphql(`
    query GetAssociationStats {
        associationStats {
            totalAssociations
            productsWithRecommendations
            averageRecommendationsPerProduct
            lastCalculated
            lastCalculationDurationMs
            enabled
        }
    }
`);

// Settings Component
function FrequentlyBoughtTogetherSettings() {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);
    const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['associationSettings'],
        queryFn: () => api.query(settingsQuery, {}),
    });

    const { data: statsData } = useQuery({
        queryKey: ['associationStats'],
        queryFn: () => api.query(statsQuery, {}),
    });

    const updateMutation = useMutation({
        mutationFn: (input: any) => api.mutate(updateSettingsMutation, { input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['associationSettings'] });
            queryClient.invalidateQueries({ queryKey: ['associationStats'] });
            setIsEditing(false);
            setSuccessMessage('Settings saved successfully');
            setTimeout(() => setSuccessMessage(null), 3000);
        },
    });

    const triggerMutation = useMutation({
        mutationFn: () => api.mutate(triggerCalculationMutation, {}),
        onSuccess: (result: any) => {
            queryClient.invalidateQueries({ queryKey: ['associationSettings'] });
            queryClient.invalidateQueries({ queryKey: ['associationStats'] });
            const message = result?.triggerAssociationCalculation?.message || 'Calculation started successfully';
            setSuccessMessage(message);
            setTimeout(() => setSuccessMessage(null), 5000);
        },
    });

    const [formData, setFormData] = useState({
        enabled: false,
        jobSchedule: '0 2 * * *',
        analysisTimeWindowDays: 90,
        minCooccurrenceThreshold: 5,
        minScoreThreshold: 0.3,
        maxRecommendationsPerProduct: 4,
        frequencyWeight: 0.5,
        recencyWeight: 0.3,
        valueWeight: 0.2,
        pdpRelatedSection: true,
        pdpUnderAddToCart: true,
        cartPage: true,
        checkoutPage: false,
        fallbackToRelatedProducts: true,
    });

    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (data?.associationSettings) {
            setFormData({
                enabled: data.associationSettings.enabled,
                jobSchedule: data.associationSettings.jobSchedule,
                analysisTimeWindowDays: data.associationSettings.analysisTimeWindowDays,
                minCooccurrenceThreshold: data.associationSettings.minCooccurrenceThreshold,
                minScoreThreshold: data.associationSettings.minScoreThreshold,
                maxRecommendationsPerProduct: data.associationSettings.maxRecommendationsPerProduct,
                frequencyWeight: data.associationSettings.frequencyWeight,
                recencyWeight: data.associationSettings.recencyWeight,
                valueWeight: data.associationSettings.valueWeight,
                pdpRelatedSection: data.associationSettings.pdpRelatedSection,
                pdpUnderAddToCart: data.associationSettings.pdpUnderAddToCart,
                cartPage: data.associationSettings.cartPage,
                checkoutPage: data.associationSettings.checkoutPage,
                fallbackToRelatedProducts: data.associationSettings.fallbackToRelatedProducts,
            });
        }
    }, [data]);

    const validateForm = () => {
        const errors: Record<string, string> = {};
        
        if (formData.analysisTimeWindowDays < 30 || formData.analysisTimeWindowDays > 365) {
            errors.analysisTimeWindowDays = 'Must be between 30 and 365 days';
        }
        
        if (formData.minCooccurrenceThreshold < 1) {
            errors.minCooccurrenceThreshold = 'Must be at least 1';
        }
        
        if (formData.maxRecommendationsPerProduct < 1 || formData.maxRecommendationsPerProduct > 20) {
            errors.maxRecommendationsPerProduct = 'Must be between 1 and 20';
        }
        
        const totalWeight = formData.frequencyWeight + formData.recencyWeight + formData.valueWeight;
        if (Math.abs(totalWeight - 1.0) > 0.01) {
            errors.weights = 'Weights must sum to 100%';
        }
        
        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSave = async () => {
        if (!validateForm()) {
            return;
        }
        await updateMutation.mutateAsync(formData);
    };

    const handleTrigger = async () => {
        await triggerMutation.mutateAsync();
    };

    const handleWeightChange = (weight: 'frequency' | 'recency' | 'value', newValue: number) => {
        const newPercentage = newValue;
        const others: Array<'frequency' | 'recency' | 'value'> = ['frequency', 'recency', 'value'].filter(w => w !== weight);
        const remaining = 100 - newPercentage;
        const othersSum = others.reduce((sum, w) => sum + (formData[`${w}Weight`] * 100), 0);
        
        if (othersSum === 0) {
            const each = remaining / others.length;
            const updates: any = { [`${weight}Weight`]: newPercentage / 100 };
            others.forEach(w => {
                updates[`${w}Weight`] = each / 100;
            });
            setFormData(prev => ({ ...prev, ...updates }));
        } else {
            const updates: any = { [`${weight}Weight`]: newPercentage / 100 };
            others.forEach(w => {
                const proportion = (formData[`${w}Weight`] * 100) / othersSum;
                updates[`${w}Weight`] = (remaining * proportion) / 100;
            });
            setFormData(prev => ({ ...prev, ...updates }));
        }
    };

    const debouncedToggleChange = useCallback(async (field: string, value: boolean) => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(async () => {
            const newFormData = { ...formData, [field]: value };
            setFormData(newFormData);
            // Auto-save for the enabled toggle
            if (field === 'enabled') {
                await updateMutation.mutateAsync(newFormData);
            } else if (!isEditing) {
                setIsEditing(true);
            }
        }, 300);
    }, [isEditing, formData, updateMutation]);

    useEffect(() => {
        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-muted-foreground"><Trans>Loading...</Trans></p>
            </div>
        );
    }

    const settings = data?.associationSettings;
    const stats = statsData?.associationStats;

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <Settings className="h-6 w-6" />
                    <Trans>Frequently Bought Together</Trans>
                </h1>
                <p className="text-sm text-muted-foreground">
                    <Trans>Configure product association recommendations and view analytics</Trans>
                </p>
            </div>

            {successMessage && (
                <div className="p-3 rounded-md text-sm bg-green-50 text-green-800 border border-green-200">
                    {successMessage}
                </div>
            )}

            {/* Overview Stats */}
            {stats && (
                <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1"><Trans>Total Associations</Trans></div>
                        <div className="text-3xl font-bold">{stats.totalAssociations}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1"><Trans>Products Covered</Trans></div>
                        <div className="text-3xl font-bold">{stats.productsWithRecommendations}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1"><Trans>Avg per Product</Trans></div>
                        <div className="text-3xl font-bold">{stats.averageRecommendationsPerProduct.toFixed(1)}</div>
                    </div>
                    <div className="p-4 border rounded-lg">
                        <div className="text-sm text-muted-foreground mb-1"><Trans>Status</Trans></div>
                        <div className="text-lg font-semibold">
                            {stats.enabled ? (
                                <span className="text-green-600"><Trans>Active</Trans></span>
                            ) : (
                                <span className="text-gray-500"><Trans>Disabled</Trans></span>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Last Calculation Info */}
            {settings && settings.lastCalculation && (
                <div className="border rounded-lg p-4">
                    <h2 className="font-semibold mb-3"><Trans>Last Calculation</Trans></h2>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                            <div className="text-muted-foreground"><Trans>Timestamp</Trans></div>
                            <div className="font-medium">
                                {new Date(settings.lastCalculation).toLocaleString()}
                            </div>
                        </div>
                        <div>
                            <div className="text-muted-foreground"><Trans>Duration</Trans></div>
                            <div className="font-medium">
                                {settings.lastCalculationDurationMs 
                                    ? `${(settings.lastCalculationDurationMs / 1000).toFixed(2)}s`
                                    : '-'
                                }
                            </div>
                        </div>
                        <div>
                            <div className="text-muted-foreground"><Trans>Associations Created</Trans></div>
                            <div className="font-medium">
                                {settings.lastCalculationAssociationsCount || 0}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="space-y-6 border rounded-lg p-6">

                    {/* Enabled Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="font-medium"><Trans>Enable Plugin</Trans></div>
                            <div className="text-xs text-muted-foreground">
                                <Trans>Calculate and show product recommendations</Trans>
                            </div>
                        </div>
                        <Switch
                            checked={formData.enabled}
                            disabled={updateMutation.isPending}
                            onCheckedChange={(checked) => debouncedToggleChange('enabled', checked)}
                        />
                    </div>

                    {!isEditing && settings && (
                        <div className="space-y-4">
                            {/* Current Settings Display */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <div className="text-muted-foreground"><Trans>Time Window</Trans></div>
                                    <div className="font-medium">{settings.analysisTimeWindowDays} days</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground"><Trans>Min Orders</Trans></div>
                                    <div className="font-medium">{settings.minCooccurrenceThreshold}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground"><Trans>Max Recommendations</Trans></div>
                                    <div className="font-medium">{settings.maxRecommendationsPerProduct}</div>
                                </div>
                                <div>
                                    <div className="text-muted-foreground"><Trans>Last Calculation</Trans></div>
                                    <div className="font-medium">
                                        {settings.lastCalculation 
                                            ? new Date(settings.lastCalculation).toLocaleString()
                                            : <Trans>Never</Trans>
                                        }
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button
                                    variant="outline"
                                    onClick={() => setIsEditing(true)}
                                >
                                    <Trans>Edit Settings</Trans>
                                </Button>
                                <Button
                                    onClick={handleTrigger}
                                    disabled={triggerMutation.isPending}
                                >
                                    <Play className="h-4 w-4 mr-2" />
                                    {triggerMutation.isPending ? <Trans>Calculating...</Trans> : <Trans>Calculate Now</Trans>}
                                </Button>
                            </div>
                        </div>
                    )}

                    {isEditing && (
                        <div className="space-y-4">
                            {/* Analysis Settings */}
                            <div>
                                <label className="text-sm font-medium block mb-2">
                                    <Trans>Analysis Time Window (days)</Trans>
                                </label>
                                <Input
                                    type="number"
                                    min="30"
                                    max="365"
                                    value={formData.analysisTimeWindowDays}
                                    onChange={(e) => {
                                        setFormData({ ...formData, analysisTimeWindowDays: parseInt(e.target.value) });
                                        if (validationErrors.analysisTimeWindowDays) {
                                            setValidationErrors(prev => ({ ...prev, analysisTimeWindowDays: '' }));
                                        }
                                    }}
                                />
                                {validationErrors.analysisTimeWindowDays && (
                                    <p className="text-xs text-destructive mt-1">{validationErrors.analysisTimeWindowDays}</p>
                                )}
                                {!validationErrors.analysisTimeWindowDays && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                        <Trans>How far back to analyze order history</Trans>
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium block mb-2">
                                        <Trans>Min Co-occurrences</Trans>
                                    </label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={formData.minCooccurrenceThreshold}
                                        onChange={(e) => {
                                            setFormData({ ...formData, minCooccurrenceThreshold: parseInt(e.target.value) });
                                            if (validationErrors.minCooccurrenceThreshold) {
                                                setValidationErrors(prev => ({ ...prev, minCooccurrenceThreshold: '' }));
                                            }
                                        }}
                                    />
                                    {validationErrors.minCooccurrenceThreshold && (
                                        <p className="text-xs text-destructive mt-1">{validationErrors.minCooccurrenceThreshold}</p>
                                    )}
                                </div>
                                <div>
                                    <label className="text-sm font-medium block mb-2">
                                        <Trans>Max Recommendations</Trans>
                                    </label>
                                    <Input
                                        type="number"
                                        min="1"
                                        max="20"
                                        value={formData.maxRecommendationsPerProduct}
                                        onChange={(e) => {
                                            setFormData({ ...formData, maxRecommendationsPerProduct: parseInt(e.target.value) });
                                            if (validationErrors.maxRecommendationsPerProduct) {
                                                setValidationErrors(prev => ({ ...prev, maxRecommendationsPerProduct: '' }));
                                            }
                                        }}
                                    />
                                    {validationErrors.maxRecommendationsPerProduct && (
                                        <p className="text-xs text-destructive mt-1">{validationErrors.maxRecommendationsPerProduct}</p>
                                    )}
                                </div>
                            </div>

                            {/* Scoring Weights */}
                            <div>
                                <label className="text-sm font-medium block mb-3">
                                    <Trans>Scoring Weights (always sum to 100%)</Trans>
                                </label>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs text-muted-foreground"><Trans>Frequency</Trans></label>
                                            <span className="text-xs font-medium">{(formData.frequencyWeight * 100).toFixed(0)}%</span>
                                        </div>
                                        <Slider
                                            value={[formData.frequencyWeight * 100]}
                                            onValueChange={([value]) => handleWeightChange('frequency', value)}
                                            min={0}
                                            max={100}
                                            step={1}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs text-muted-foreground"><Trans>Recency</Trans></label>
                                            <span className="text-xs font-medium">{(formData.recencyWeight * 100).toFixed(0)}%</span>
                                        </div>
                                        <Slider
                                            value={[formData.recencyWeight * 100]}
                                            onValueChange={([value]) => handleWeightChange('recency', value)}
                                            min={0}
                                            max={100}
                                            step={1}
                                        />
                                    </div>
                                    <div>
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="text-xs text-muted-foreground"><Trans>Value</Trans></label>
                                            <span className="text-xs font-medium">{(formData.valueWeight * 100).toFixed(0)}%</span>
                                        </div>
                                        <Slider
                                            value={[formData.valueWeight * 100]}
                                            onValueChange={([value]) => handleWeightChange('value', value)}
                                            min={0}
                                            max={100}
                                            step={1}
                                        />
                                    </div>
                                    <div className="text-xs text-right">
                                        {validationErrors.weights ? (
                                            <span className="text-destructive">{validationErrors.weights}</span>
                                        ) : (
                                            <span className="text-muted-foreground">
                                                <Trans>Total: {((formData.frequencyWeight + formData.recencyWeight + formData.valueWeight) * 100).toFixed(0)}%</Trans>
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Display Locations */}
                            <div>
                                <label className="text-sm font-medium block mb-3"><Trans>Display Locations</Trans></label>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm"><Trans>PDP - Related Section</Trans></span>
                                        <Switch
                                            checked={formData.pdpRelatedSection}
                                            disabled={updateMutation.isPending}
                                            onCheckedChange={(checked) => debouncedToggleChange('pdpRelatedSection', checked)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm"><Trans>PDP - Under Add to Cart</Trans></span>
                                        <Switch
                                            checked={formData.pdpUnderAddToCart}
                                            disabled={updateMutation.isPending}
                                            onCheckedChange={(checked) => debouncedToggleChange('pdpUnderAddToCart', checked)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm"><Trans>Cart Page</Trans></span>
                                        <Switch
                                            checked={formData.cartPage}
                                            disabled={updateMutation.isPending}
                                            onCheckedChange={(checked) => debouncedToggleChange('cartPage', checked)}
                                        />
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm"><Trans>Checkout Page</Trans></span>
                                        <Switch
                                            checked={formData.checkoutPage}
                                            disabled={updateMutation.isPending}
                                            onCheckedChange={(checked) => debouncedToggleChange('checkoutPage', checked)}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Fallback */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium"><Trans>Fallback to Related Products</Trans></div>
                                    <div className="text-xs text-muted-foreground">
                                        <Trans>Show related products when insufficient associations</Trans>
                                    </div>
                                </div>
                                <Switch
                                    checked={formData.fallbackToRelatedProducts}
                                    disabled={updateMutation.isPending}
                                    onCheckedChange={(checked) => debouncedToggleChange('fallbackToRelatedProducts', checked)}
                                />
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button
                                    onClick={handleSave}
                                    disabled={updateMutation.isPending}
                                >
                                    {updateMutation.isPending ? <Trans>Saving...</Trans> : <Trans>Save Settings</Trans>}
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={() => setIsEditing(false)}
                                >
                                    <Trans>Cancel</Trans>
                                </Button>
                            </div>
                        </div>
                    )}
            </div>
        </div>
    );
}

// Dashboard Extension Definition
export default defineDashboardExtension({
    translations: {
        en: () => import('./i18n/en'),
        fr: () => import('./i18n/fr'),
        ar: () => import('./i18n/ar'),
    },
    routes: [
        {
            path: '/frequently-bought-together',
            component: FrequentlyBoughtTogetherSettings,
            navMenuItem: {
                sectionId: 'marketing',
                id: 'fbt-settings',
                title: 'Frequently Bought Together',
            },
        },
    ],
});
