import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
    defineDashboardExtension,
    Button,
    Input,
    Textarea,
    api,
} from '@vendure/dashboard';
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Coins, TrendingUp, TrendingDown } from 'lucide-react';
import { graphql } from '@/gql';

type BlockProps = {
    context: {
        entity?: {
            id?: string;
            emailAddress?: string | null;
            firstName?: string | null;
            lastName?: string | null;
        };
    };
};

const customerRewardPointsQuery = graphql(`
    query CustomerRewardPoints($customerId: ID!) {
        customerRewardPoints(customerId: $customerId) {
            id
            balance
            lifetimeEarned
            lifetimeRedeemed
            availablePoints
        }
    }
`);

const adjustCustomerPointsMutation = graphql(`
    mutation AdjustCustomerPoints($input: AdjustCustomerPointsInput!) {
        adjustCustomerPoints(input: $input) {
            id
            balance
            lifetimeEarned
            lifetimeRedeemed
            availablePoints
        }
    }
`);

const rewardTransactionHistoryQuery = graphql(`
    query RewardTransactionHistory($customerId: ID, $options: RewardTransactionListOptions) {
        rewardTransactionHistory(customerId: $customerId, options: $options) {
            items {
                id
                type
                points
                description
                createdAt
                orderTotal
            }
            totalItems
        }
    }
`);

const rewardPointSettingsQuery = graphql(`
    query RewardPointSettings {
        rewardPointSettings {
            id
            enabled
            earnRate
            redeemRate
            minRedeemAmount
            maxRedeemPerOrder
        }
    }
`);

const updateRewardPointSettingsMutation = graphql(`
    mutation UpdateRewardPointSettings($input: UpdateRewardPointSettingsInput!) {
        updateRewardPointSettings(input: $input) {
            id
            enabled
            earnRate
            redeemRate
            minRedeemAmount
            maxRedeemPerOrder
        }
    }
`);

function RewardPointsSummaryBlock({ context }: BlockProps) {
    const customerId = context.entity?.id;
    const [points, setPoints] = useState('');
    const [description, setDescription] = useState('');
    const [isAdjusting, setIsAdjusting] = useState(false);
    const queryClient = useQueryClient();

    const { data, isLoading, error } = useQuery({
        queryKey: ['customerRewardPoints', customerId],
        queryFn: () => api.query(customerRewardPointsQuery, { customerId: customerId || '' }),
        enabled: !!customerId,
    });

    const adjustPointsMutation = useMutation({
        mutationFn: (input: { customerId: string; points: number; description: string }) =>
            api.mutate(adjustCustomerPointsMutation, { input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['customerRewardPoints', customerId] });
        },
    });

    const handleAdjust = async () => {
        if (!customerId || !points || !description) return;

        try {
            await adjustPointsMutation.mutateAsync({
                customerId,
                points: parseInt(points),
                description,
            });
            setPoints('');
            setDescription('');
            setIsAdjusting(false);
        } catch (err) {
            console.error('Failed to adjust points:', err);
        }
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Reward Points</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Loading...</p>
                </CardContent>
            </Card>
        );
    }

    if (error || !data?.customerRewardPoints) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Reward Points</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-destructive">Failed to load reward points</p>
                </CardContent>
            </Card>
        );
    }

    const rewardPoints = data.customerRewardPoints;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Coins className="h-4 w-4" />
                    Reward Points
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-2xl font-bold">{rewardPoints.balance}</div>
                        <div className="text-xs text-muted-foreground">Current Balance</div>
                    </div>
                    <div>
                        <div className="text-2xl font-bold">{rewardPoints.availablePoints}</div>
                        <div className="text-xs text-muted-foreground">Available</div>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="h-3 w-3" />
                        {rewardPoints.lifetimeEarned} earned
                    </div>
                    <div className="flex items-center gap-1 text-orange-600">
                        <TrendingDown className="h-3 w-3" />
                        {rewardPoints.lifetimeRedeemed} redeemed
                    </div>
                </div>

                {!isAdjusting ? (
                    <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setIsAdjusting(true)}
                    >
                        Adjust Points
                    </Button>
                ) : (
                    <div className="space-y-2">
                        <Input
                            type="number"
                            placeholder="Points (+ or -)" 
                            value={points}
                            onChange={(e) => setPoints(e.target.value)}
                        />
                        <Textarea
                            placeholder="Reason for adjustment"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={2}
                        />
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                onClick={handleAdjust}
                                disabled={!points || !description}
                            >
                                Apply
                            </Button>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                    setIsAdjusting(false);
                                    setPoints('');
                                    setDescription('');
                                }}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function RewardPointsSettingsBlock() {
    const queryClient = useQueryClient();
    const [isEditing, setIsEditing] = useState(false);

    const { data, isLoading, error } = useQuery({
        queryKey: ['rewardPointSettings'],
        queryFn: () => api.query(rewardPointSettingsQuery, {}),
    });

    const updateSettingsMutation = useMutation({
        mutationFn: (input: {
            enabled?: boolean;
            earnRate?: number;
            redeemRate?: number;
            minRedeemAmount?: number;
            maxRedeemPerOrder?: number;
        }) => api.mutate(updateRewardPointSettingsMutation, { input }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['rewardPointSettings'] });
            setIsEditing(false);
        },
    });

    const [formData, setFormData] = useState({
        enabled: false,
        earnRate: 1,
        redeemRate: 0.01,
        minRedeemAmount: 100,
        maxRedeemPerOrder: 10000,
    });

    // Update form data when settings load
    useEffect(() => {
        if (data?.rewardPointSettings) {
            setFormData({
                enabled: data.rewardPointSettings.enabled,
                earnRate: data.rewardPointSettings.earnRate,
                redeemRate: data.rewardPointSettings.redeemRate,
                minRedeemAmount: data.rewardPointSettings.minRedeemAmount,
                maxRedeemPerOrder: data.rewardPointSettings.maxRedeemPerOrder,
            });
        }
    }, [data]);

    const handleSave = async () => {
        await updateSettingsMutation.mutateAsync(formData);
    };

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Reward Points Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Loading settings...</p>
                </CardContent>
            </Card>
        );
    }

    if (error || !data?.rewardPointSettings) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Reward Points Settings</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-destructive">Failed to load settings</p>
                </CardContent>
            </Card>
        );
    }

    const settings = data.rewardPointSettings;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Coins className="h-5 w-5" />
                        Reward Points Settings
                    </span>
                    {!isEditing && (
                        <Button variant="outline" size="sm" onClick={() => {
                            setFormData({
                                enabled: settings.enabled,
                                earnRate: settings.earnRate,
                                redeemRate: settings.redeemRate,
                                minRedeemAmount: settings.minRedeemAmount,
                                maxRedeemPerOrder: settings.maxRedeemPerOrder,
                            });
                            setIsEditing(true);
                        }}>
                            Edit
                        </Button>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent>
                {!isEditing ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Status</span>
                            <span className={`text-sm ${settings.enabled ? 'text-green-600' : 'text-muted-foreground'}`}>
                                {settings.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Earn Rate</span>
                            <span className="text-sm">{settings.earnRate} points per $1</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Redeem Rate</span>
                            <span className="text-sm">${settings.redeemRate} per point</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Min Redeem Amount</span>
                            <span className="text-sm">{settings.minRedeemAmount} points</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Max Per Order</span>
                            <span className="text-sm">{settings.maxRedeemPerOrder} points</span>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium">Enable Reward Points</label>
                            <input
                                type="checkbox"
                                checked={formData.enabled}
                                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                                className="h-4 w-4"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-1">Earn Rate (points per $1)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.earnRate}
                                onChange={(e) => setFormData({ ...formData, earnRate: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-1">Redeem Rate ($ per point)</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={formData.redeemRate}
                                onChange={(e) => setFormData({ ...formData, redeemRate: parseFloat(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-1">Min Redeem Amount (points)</label>
                            <Input
                                type="number"
                                value={formData.minRedeemAmount}
                                onChange={(e) => setFormData({ ...formData, minRedeemAmount: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium block mb-1">Max Per Order (points)</label>
                            <Input
                                type="number"
                                value={formData.maxRedeemPerOrder}
                                onChange={(e) => setFormData({ ...formData, maxRedeemPerOrder: parseInt(e.target.value) })}
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button
                                onClick={handleSave}
                                disabled={updateSettingsMutation.isPending}
                            >
                                {updateSettingsMutation.isPending ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                                variant="outline"
                                onClick={() => setIsEditing(false)}
                            >
                                Cancel
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function RewardPointsHistoryBlock({ context }: BlockProps) {
    const customerId = context.entity?.id;

    const { data, isLoading, error } = useQuery({
        queryKey: ['rewardTransactionHistory', customerId],
        queryFn: () =>
            api.query(rewardTransactionHistoryQuery, {
                customerId: customerId || '',
                options: {
                    skip: 0,
                    take: 10,
                },
            }),
        enabled: !!customerId,
    });

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Reward Points History</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Loading history...</p>
                </CardContent>
            </Card>
        );
    }

    if (error || !data?.rewardTransactionHistory) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Reward Points History</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-destructive">Failed to load history</p>
                </CardContent>
            </Card>
        );
    }

    const transactions = data.rewardTransactionHistory.items;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Reward Points History</CardTitle>
            </CardHeader>
            <CardContent>
                {transactions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No transactions yet</p>
                ) : (
                    <div className="space-y-2">
                        {transactions.map((tx) => (
                            <div
                                key={tx.id}
                                className="flex items-start justify-between border-b pb-2 last:border-0"
                            >
                                <div className="flex-1">
                                    <div className="text-sm font-medium">{tx.description}</div>
                                    <div className="text-xs text-muted-foreground">
                                        {new Date(tx.createdAt).toLocaleDateString()} •{' '}
                                        {tx.type}
                                    </div>
                                </div>
                                <div
                                    className={`text-sm font-bold ${
                                        tx.points > 0 ? 'text-green-600' : 'text-orange-600'
                                    }`}
                                >
                                    {tx.points > 0 ? '+' : ''}{tx.points}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

export default defineDashboardExtension({
    pageBlocks: [
        {
            id: 'reward-points-summary',
            location: {
                pageId: 'customer-detail',
                column: 'side',
                position: {
                    blockId: 'groups',
                    order: 'after',
                },
            },
            component: RewardPointsSummaryBlock,
        },
        {
            id: 'reward-points-history',
            location: {
                pageId: 'customer-detail',
                column: 'main',
                position: {
                    blockId: 'orders',
                    order: 'after',
                },
            },
            component: RewardPointsHistoryBlock,
        },
        {
            id: 'reward-points-settings',
            location: {
                pageId: 'global-settings',
                column: 'main',
                position: {
                    blockId: 'main-form',
                    order: 'after',
                },
            },
            component: RewardPointsSettingsBlock,
        },
    ],
});
