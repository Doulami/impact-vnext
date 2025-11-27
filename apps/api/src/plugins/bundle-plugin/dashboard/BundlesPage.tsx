import React, { useState, useEffect } from 'react';
import { useGraphQL } from '@vendure/dashboard/react';
import {
    Card,
    CardHeader,
    CardContent,
    Button,
    Table,
    TableHead,
    TableBody,
    TableRow,
    TableCell,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Checkbox,
    FormControlLabel,
    IconButton,
    Chip,
    Box,
    Typography,
    Grid,
} from '@vendure/dashboard/react-components';

interface Bundle {
    id: string;
    shellProduct: {
        id: string;
        name: string;
        slug?: string;
        description?: string;
    };
    status: string;
    discountType: string;
    fixedPrice?: number;
    percentOff?: number;
    effectivePrice: number;
    category?: string;
    items: BundleItem[];
}

interface BundleItem {
    id?: string;
    productVariant: {
        id: string;
        name: string;
    };
    quantity: number;
    unitPrice: number;
}

const BUNDLES_QUERY = `
    query GetBundles {
        bundles {
            items {
                id
                shellProduct {
                    id
                    name
                    slug
                    description
                }
                status
                discountType
                fixedPrice
                percentOff
                effectivePrice
                items {
                    id
                    productVariant {
                        id
                        name
                    }
                    quantity
                }
            }
        }
    }
`;

const CREATE_BUNDLE_MUTATION = `
    mutation CreateBundle($input: CreateBundleInput!) {
        createBundle(input: $input) {
            id
            shellProduct {
                id
                name
            }
            status
            effectivePrice
        }
    }
`;

const UPDATE_BUNDLE_MUTATION = `
    mutation UpdateBundle($input: UpdateBundleInput!) {
        updateBundle(input: $input) {
            id
            shellProduct {
                id
                name
            }
            status
            effectivePrice
        }
    }
`;

const DELETE_BUNDLE_MUTATION = `
    mutation DeleteBundle($id: ID!) {
        deleteBundle(id: $id) {
            result
            message
        }
    }
`;

export function BundlesPage() {
    const [bundles, setBundles] = useState<Bundle[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);
    
    // Form state
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        description: '',
        discountType: 'FIXED',
        fixedPrice: 0,
        percentOff: 0,
        category: '',
        items: [] as Array<{ productVariantId: string; quantity: number; unitPrice: number }>,
    });

    const { query, mutate } = useGraphQL();

    useEffect(() => {
        loadBundles();
    }, []);

    const loadBundles = async () => {
        setLoading(true);
        try {
            const result = await query(BUNDLES_QUERY);
            setBundles(result.bundles.items);
        } catch (error) {
            console.error('Failed to load bundles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setEditingBundle(null);
        setFormData({
            name: '',
            slug: '',
            description: '',
            discountType: 'FIXED',
            fixedPrice: 0,
            percentOff: 0,
            category: '',
            items: [],
        });
        setDialogOpen(true);
    };

    const handleEdit = (bundle: Bundle) => {
        setEditingBundle(bundle);
        setFormData({
            name: bundle.shellProduct.name,
            slug: bundle.shellProduct.slug || '',
            description: bundle.shellProduct.description || '',
            discountType: bundle.discountType,
            fixedPrice: bundle.fixedPrice || 0,
            percentOff: bundle.percentOff || 0,
            category: bundle.category || '',
            items: bundle.items.map(item => ({
                productVariantId: item.productVariant.id,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
            })),
        });
        setDialogOpen(true);
    };

    const handleSave = async () => {
        try {
            const input = {
                ...formData,
                assets: [],
            };

            if (editingBundle) {
                await mutate(UPDATE_BUNDLE_MUTATION, {
                    input: { id: editingBundle.id, ...input },
                });
            } else {
                await mutate(CREATE_BUNDLE_MUTATION, { input });
            }

            setDialogOpen(false);
            loadBundles();
        } catch (error) {
            console.error('Failed to save bundle:', error);
            alert(`Error: ${error.message || 'Failed to save bundle'}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this bundle?')) return;

        try {
            await mutate(DELETE_BUNDLE_MUTATION, { id });
            loadBundles();
        } catch (error) {
            console.error('Failed to delete bundle:', error);
            alert(`Error: ${error.message || 'Failed to delete bundle'}`);
        }
    };

    const addComponent = () => {
        setFormData({
            ...formData,
            items: [...formData.items, { productVariantId: '', quantity: 1, unitPrice: 0 }],
        });
    };

    const removeComponent = (index: number) => {
        setFormData({
            ...formData,
            items: formData.items.filter((_, i) => i !== index),
        });
    };

    const updateComponent = (index: number, field: string, value: any) => {
        const newItems = [...formData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setFormData({ ...formData, items: newItems });
    };

    if (loading) {
        return (
            <Box p={3}>
                <Typography>Loading bundles...</Typography>
            </Box>
        );
    }

    return (
        <Box p={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">Bundle Management</Typography>
                <Button variant="contained" color="primary" onClick={handleCreate}>
                    Create Bundle
                </Button>
            </Box>

            <Card>
                <CardContent>
                    {bundles.length === 0 ? (
                        <Box textAlign="center" py={4}>
                            <Typography color="textSecondary">
                                No bundles yet. Click "Create Bundle" to get started.
                            </Typography>
                        </Box>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Name</TableCell>
                                    <TableCell>Price</TableCell>
                                    <TableCell>Components</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Category</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {bundles.map((bundle) => (
                                    <TableRow key={bundle.id}>
                                        <TableCell>{bundle.shellProduct.name}</TableCell>
                                        <TableCell>${(bundle.effectivePrice / 100).toFixed(2)}</TableCell>
                                        <TableCell>{bundle.items.length} items</TableCell>
                                        <TableCell>
                                            <Chip
                                                label={bundle.status}
                                                color={bundle.status === 'ACTIVE' ? 'success' : 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>{bundle.category || '-'}</TableCell>
                                        <TableCell align="right">
                                            <Button
                                                size="small"
                                                onClick={() => handleEdit(bundle)}
                                                style={{ marginRight: 8 }}
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                size="small"
                                                color="error"
                                                onClick={() => handleDelete(bundle.id)}
                                            >
                                                Delete
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>
                    {editingBundle ? 'Edit Bundle' : 'Create Bundle'}
                </DialogTitle>
                <DialogContent>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12}>
                            <TextField
                                label="Bundle Name"
                                fullWidth
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Slug"
                                fullWidth
                                value={formData.slug}
                                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Fixed Price (in cents)"
                                fullWidth
                                type="number"
                                value={formData.fixedPrice}
                                onChange={(e) => setFormData({ ...formData, fixedPrice: parseInt(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                label="Description"
                                fullWidth
                                multiline
                                rows={3}
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Category"
                                fullWidth
                                value={formData.category}
                                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Discount Type"
                                fullWidth
                                required
                                select
                                SelectProps={{ native: true }}
                                value={formData.discountType}
                                onChange={(e) => setFormData({ ...formData, discountType: e.target.value })}
                            >
                                <option value="FIXED">Fixed Price</option>
                                <option value="PERCENTAGE">Percentage Off</option>
                            </TextField>
                        </Grid>

                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Bundle Components
                            </Typography>
                            {formData.items.map((item, index) => (
                                <Grid container spacing={2} key={index} sx={{ mb: 2 }}>
                                    <Grid item xs={5}>
                                        <TextField
                                            label="Variant ID"
                                            fullWidth
                                            required
                                            value={item.productVariantId}
                                            onChange={(e) => updateComponent(index, 'productVariantId', e.target.value)}
                                        />
                                    </Grid>
                                    <Grid item xs={2}>
                                        <TextField
                                            label="Quantity"
                                            fullWidth
                                            required
                                            type="number"
                                            value={item.quantity}
                                            onChange={(e) => updateComponent(index, 'quantity', parseInt(e.target.value))}
                                        />
                                    </Grid>
                                    <Grid item xs={3}>
                                        <TextField
                                            label="Unit Price"
                                            fullWidth
                                            required
                                            type="number"
                                            value={item.unitPrice}
                                            onChange={(e) => updateComponent(index, 'unitPrice', parseInt(e.target.value))}
                                        />
                                    </Grid>
                                    <Grid item xs={2}>
                                        <IconButton onClick={() => removeComponent(index)} color="error">
                                            ×
                                        </IconButton>
                                    </Grid>
                                </Grid>
                            ))}
                            <Button variant="outlined" onClick={addComponent}>
                                Add Component
                            </Button>
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSave} variant="contained" color="primary">
                        Save Bundle
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}