"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useOrders } from "@/hooks/useOrders";
import { useToast } from "@/components/Toast";
import { ToastContainer } from "@/components/Toast";
import { WalletGuard } from "@/components/WalletGuard";
import { DisputeSection } from "@/components/DisputeSection";
import { useState, useEffect } from "react";
import styles from "../farmer.module.css";

export default function FarmerOrders() {
    const account = useCurrentAccount();
    const { orders, isLoading, refetch } = useOrders({ farmer: account?.address });
    const { toasts, addToast, removeToast } = useToast();
    
    // Use useState with lazy initialization for current time
    const [currentTime] = useState(() => Date.now());
    
    // Update time when orders change
    useEffect(() => {
        // Time is checked when component mounts and when orders update
    }, [orders]);

    return (
        <WalletGuard>
            <div className={styles.container}>
                <h1 className={styles.title}>🌾 My Orders (Farmer)</h1>
                <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
                    Manage your orders and respond to disputes
                </p>

                {isLoading ? (
                    <div className={styles.loading}>Loading your orders...</div>
                ) : !orders || orders.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📦</div>
                        <div className={styles.emptyText}>No Orders Yet</div>
                        <div className={styles.emptySubtext}>
                            Your sold products will appear here
                        </div>
                    </div>
                ) : (
                    <div className={styles.orderList}>
                        {orders.map((order: { 
                            id: string; 
                            deadline: string; 
                            total_price: string; 
                            quantity: string; 
                            status: number; 
                            buyer: string; 
                            dispute?: {
                                sui_object_id: string;
                                farmer_percentage: number;
                                buyer_percentage: number;
                                status: number;
                                last_proposer?: string | null;
                                proposal_count?: number;
                                voting_enabled?: boolean;
                            }
                        }, index: number) => {
                            const isExpired = Number(order.deadline) < currentTime;
                            const hasDispute = !!order.dispute;
                            const isDisputeResolved = order.dispute?.status === 1;

                            return (
                                <div key={index} className={styles.orderCard}>
                                    <div className={styles.orderInfo}>
                                        <div className={styles.orderId}>
                                            Order ID: {order.id.slice(0, 8)}...
                                        </div>
                                        <div className={styles.price}>
                                            {(Number(order.total_price) / 1_000_000).toFixed(2)} TATO
                                        </div>
                                        <div>Qty: {order.quantity}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>
                                            Buyer: {order.buyer.slice(0, 6)}...{order.buyer.slice(-4)}
                                        </div>
                                        
                                        {/* Status Badge */}
                                        {Number(order.status) === 1 && !hasDispute && (
                                            <span className={styles.status} style={{ backgroundColor: '#fef3c7', color: '#92400e' }}>
                                                In Escrow
                                            </span>
                                        )}
                                        {Number(order.status) === 2 && (
                                            <span className={styles.status} style={{ backgroundColor: '#d1fae5', color: '#065f46' }}>
                                                Completed
                                            </span>
                                        )}
                                        {Number(order.status) === 3 && (
                                            <span className={styles.status} style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                                                Refunded
                                            </span>
                                        )}
                                        {hasDispute && !isDisputeResolved && (
                                            <span className={styles.status} style={{ backgroundColor: '#fed7aa', color: '#9a3412' }}>
                                                ⚠️ Dispute Active
                                            </span>
                                        )}
                                        {isExpired && Number(order.status) === 1 && !hasDispute && (
                                            <span className={styles.status} style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>
                                                Expired
                                            </span>
                                        )}
                                    </div>

                                    <div className={styles.actionArea}>
                                        {/* No action buttons for farmer - just view status */}
                                        {Number(order.status) === 1 && !hasDispute && !isExpired && (
                                            <div style={{ 
                                                padding: '12px 20px', 
                                                backgroundColor: '#e0f2fe', 
                                                borderRadius: '8px',
                                                color: '#075985',
                                                fontWeight: '500',
                                                fontSize: '0.9rem'
                                            }}>
                                                ⏳ Waiting for buyer confirmation
                                            </div>
                                        )}
                                    </div>

                                    {/* Show Dispute Negotiation UI if dispute exists */}
                                    {hasDispute && (
                                        <DisputeSection 
                                            order={{
                                                id: order.id,
                                                farmer: account?.address || '',
                                                buyer: order.buyer,
                                                dispute: order.dispute
                                            }} 
                                            onUpdate={refetch} 
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
                
                <ToastContainer toasts={toasts} onRemove={removeToast} />
            </div>
        </WalletGuard>
    );
}
