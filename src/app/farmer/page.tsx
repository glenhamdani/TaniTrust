"use client";

import { useState } from "react";
import Image from "next/image";
import { useCurrentAccount } from "@mysten/dapp-kit";
import styles from "./farmer.module.css";
import { useProducts, Product } from "@/hooks/useProducts";
import { useOrders, Order } from "@/hooks/useOrders";
import { ConnectWalletPrompt } from "@/components/ConnectWalletPrompt";
import { WalletGuard } from "@/components/WalletGuard";
import { ProductUploadForm } from "@/components/ProductUploadForm";
import { UpdateStockModal } from "@/components/UpdateStockModal";
import { useDeleteProduct } from "@/hooks/useDeleteProduct";
import { useToast, ToastContainer } from "@/components/Toast";
import { ConfirmModal } from "@/components/ConfirmModal";
import { DisputeSection } from "@/components/DisputeSection";

export default function FarmerDashboard() {
    const account = useCurrentAccount();
    const { products, refetch } = useProducts();
    const { orders, isLoading: ordersLoading, refetch: refetchOrders } = useOrders({ farmer: account?.address });
    const { deleteProduct, isDeleting } = useDeleteProduct();
    const { toasts, addToast, removeToast } = useToast();
    
    // Current time for expiry check
    const [currentTime] = useState(() => Date.now());
    
    // Modal state
    const [editingProduct, setEditingProduct] = useState<{
        id: string;
        name: string;
        stock: number;
    } | null>(null);

    const [productToDelete, setProductToDelete] = useState<{
        id: string;
        name: string;
    } | null>(null);

    // Filter products by current user
    const myProducts = products.filter(p => p.farmer === account?.address);

    const handleEditStock = (product: Product) => {
        setEditingProduct({
            id: product.id,
            name: product.name,
            stock: Number(product.stock),
        });
    };

    const confirmDelete = (product: Product) => {
        setProductToDelete({
            id: product.id,
            name: product.name,
        });
    };

    const handleExecuteDelete = async () => {
        if (!productToDelete) return;

        try {
            await deleteProduct(productToDelete.id);
            addToast(`Successfully deleted "${productToDelete.name}"`, "success");
            refetch(); // Refresh product list
            setProductToDelete(null);
        } catch (error) {
            addToast(`Failed to delete product: ${error instanceof Error ? error.message : "Unknown error"}`, "error");
        }
    };

    const handleCloseModal = () => {
        setEditingProduct(null);
    };

    const handleUpdateSuccess = () => {
        addToast("Product stock updated successfully!", "success");
        refetch(); // Refresh product list
    };

    return (
        <WalletGuard 
            fallback={
                <div className={styles.container}>
                    <ConnectWalletPrompt message="Connect your wallet to list products and manage inventory." />
                </div>
            }
        >
            <div className={`${styles.container} page-container`}>
                <h1 className={styles.title}>Farmer Dashboard 👨‍🌾</h1>

                {/* Use the complete ProductUploadForm with image upload */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>Upload New Product</h2>
                    <ProductUploadForm 
                        onSuccess={() => {
                            addToast("Product created successfully!", "success");
                            refetch();
                        }}
                        onError={(msg) => addToast(msg, "error")}
                    />
                </div>

                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>My Products</h2>
                    {myProducts.length === 0 ? (
                        <div className={styles.emptyProducts}>
                            <p>No products listed yet.</p>
                            <p className={styles.emptyHint}>Upload your first product above to get started!</p>
                        </div>
                    ) : (
                        <div className={styles.productList}>
                            {myProducts.map((p, index) => (
                                <div key={p.id} className={`${styles.productItem} stagger-item`} style={{ animationDelay: `${index * 0.05}s` }}>
                                    <div className={styles.productDetails}>
                                        <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                                            {p.imageUrl && (
                                                <div style={{ position: "relative", width: 40, height: 40, borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
                                                    <Image 
                                                        src={p.imageUrl} 
                                                        alt={p.name} 
                                                        fill 
                                                        sizes="40px"
                                                        style={{ objectFit: 'cover' }} 
                                                    />
                                                </div>
                                            )}
                                            <strong>{p.name}</strong>
                                        </div>
                                        <div className={styles.productMeta}>Stock: {Number(p.stock)} kg</div>
                                    </div>
                                    <div className={styles.productActions}>
                                        <div className={styles.productPrice}>
                                            {Number(p.price) / 100_000_000} TATO
                                        </div>
                                        <div className={styles.actionButtons}>
                                            <button
                                                className={styles.editBtn}
                                                onClick={() => handleEditStock(p)}
                                                type="button"
                                                disabled={isDeleting}
                                            >
                                                Edit Stock
                                            </button>
                                            <button
                                                className={styles.deleteBtn}
                                                onClick={() => confirmDelete(p)}
                                                type="button"
                                                disabled={isDeleting}
                                            >
                                                {isDeleting && productToDelete?.id === p.id ? "Deleting..." : "Delete Item"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* My Orders Section */}
                <div className={styles.section}>
                    <h2 className={styles.sectionTitle}>📦 My Orders</h2>
                    <p style={{ color: '#6b7280', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
                        Manage your orders and respond to disputes
                    </p>
                    
                    {ordersLoading ? (
                        <div className={styles.loading}>Loading orders...</div>
                    ) : orders.length === 0 ? (
                        <div className={styles.emptyProducts}>
                            <p>📦 No Orders Yet</p>
                            <p className={styles.emptyHint}>Your sold products will appear here</p>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {orders.map((order: Order, index: number) => {
                                const hasDispute = !!order.dispute;
                                const isExpired = Number(order.deadline) < currentTime;

                                return (
                                    <div key={index} style={{
                                        backgroundColor: 'white',
                                        border: '1px solid #e5e7eb',
                                        borderRadius: '12px',
                                        padding: '20px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                    }}>
                                        {/* Product Info with Image */}
                                        {order.product && (
                                            <div style={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '12px',
                                                marginBottom: '16px',
                                                paddingBottom: '16px',
                                                borderBottom: '1px solid #f3f4f6'
                                            }}>
                                                {order.product.image_url && (
                                                    <div style={{ 
                                                        position: 'relative', 
                                                        width: '60px', 
                                                        height: '60px', 
                                                        borderRadius: '8px', 
                                                        overflow: 'hidden',
                                                        flexShrink: 0,
                                                        border: '2px solid #e5e7eb'
                                                    }}>
                                                        <Image 
                                                            src={order.product.image_url} 
                                                            alt={order.product.name} 
                                                            fill 
                                                            sizes="60px"
                                                            style={{ objectFit: 'cover' }} 
                                                        />
                                                    </div>
                                                )}
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ 
                                                        fontSize: '1.1rem', 
                                                        fontWeight: '600', 
                                                        color: '#1f2937',
                                                        marginBottom: '4px'
                                                    }}>
                                                        {order.product.name}
                                                    </div>
                                                    <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                                        Order ID: {order.id.slice(0, 8)}...
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div style={{ marginBottom: '12px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ fontSize: '1.2rem', fontWeight: '600', color: '#1f2937' }}>
                                                    {(Number(order.total_price) / 1_000_000).toFixed(2)} TATO
                                                </div>
                                                <div style={{ fontSize: '0.9rem', color: '#6b7280' }}>
                                                    Qty: {order.quantity}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
                                                Buyer: {order.buyer.slice(0, 6)}...{order.buyer.slice(-4)}
                                            </div>
                                            
                                            {/* Status Badges */}
                                            {Number(order.status) === 1 && !hasDispute && (
                                                <span style={{ 
                                                    display: 'inline-block',
                                                    marginTop: '8px',
                                                    padding: '4px 12px',
                                                    backgroundColor: '#fef3c7',
                                                    color: '#92400e',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600'
                                                }}>
                                                    In Escrow
                                                </span>
                                            )}
                                            {hasDispute && (
                                                <span style={{ 
                                                    display: 'inline-block',
                                                    marginTop: '8px',
                                                    padding: '4px 12px',
                                                    backgroundColor: '#fed7aa',
                                                    color: '#9a3412',
                                                    borderRadius: '12px',
                                                    fontSize: '0.8rem',
                                                    fontWeight: '600'
                                                }}>
                                                    ⚠️ Dispute Active
                                                </span>
                                            )}
                                        </div>

                                        {/* Dispute Section */}
                                        {hasDispute && (
                                            <DisputeSection 
                                                order={{
                                                    id: order.id,
                                                    farmer: account?.address || '',
                                                    buyer: order.buyer,
                                                    dispute: order.dispute
                                                }} 
                                                onUpdate={refetchOrders} 
                                            />
                                        )}

                                        {/* Waiting Message */}
                                        {Number(order.status) === 1 && !hasDispute && !isExpired && (
                                            <div style={{ 
                                                padding: '12px 20px', 
                                                backgroundColor: '#e0f2fe', 
                                                borderRadius: '8px',
                                                color: '#075985',
                                                fontWeight: '500',
                                                fontSize: '0.9rem',
                                                marginTop: '12px'
                                            }}>
                                                ⏳ Waiting for buyer confirmation
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Update Stock Modal */}
            {editingProduct && (
                <UpdateStockModal
                    productId={editingProduct.id}
                    productName={editingProduct.name}
                    currentStock={editingProduct.stock}
                    onClose={handleCloseModal}
                    onSuccess={handleUpdateSuccess}
                />
            )}

            {/* Delete Confirmation Modal */}
            <ConfirmModal 
                isOpen={!!productToDelete}
                title="Delete Product"
                message={`Are you sure you want to permanently delete "${productToDelete?.name}"? This action cannot be undone.`}
                onClose={() => setProductToDelete(null)}
                onConfirm={handleExecuteDelete}
                isLoading={isDeleting}
            />

            {/* Toast Notifications */}
            <ToastContainer toasts={toasts} removeToast={removeToast} />
        </WalletGuard>
    );
}
