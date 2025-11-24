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
import { useState } from 'react';
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
    ],
});
