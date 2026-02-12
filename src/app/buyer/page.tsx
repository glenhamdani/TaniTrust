"use client";

import Image from "next/image";
import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONSTANTS } from "@/lib/constants";
import styles from "./buyer.module.css";
import { useOrders, Order } from "@/hooks/useOrders";
import { ConnectWalletPrompt } from "@/components/ConnectWalletPrompt";
import { WalletGuard } from "@/components/WalletGuard";
import { useToast, ToastContainer } from "@/components/Toast";
import { useRefundActions } from "@/hooks/useRefundActions";
import { useDisputeActions } from "@/hooks/useDisputeActions";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { DisputeSection } from "@/components/DisputeSection";
import { ConfirmModal } from "@/components/ConfirmModal";
import { useState, useEffect } from "react";
import { resolveIpfsUrl } from "@/lib/ipfs";

export default function BuyerDashboard() {
    const { orders, isLoading, refetch } = useOrders();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const { toasts, addToast, removeToast } = useToast();
    const { processExpiredOrder, isProcessing: isRefunding } = useRefundActions();
    const { createDispute, isCreating: isDisputing } = useDisputeActions();
    const account = useCurrentAccount();
    const client = useSuiClient();

    // Use useState with lazy initialization for current time
    const [currentTime, setCurrentTime] = useState(() => Date.now());

    // Modal state for dispute confirmation
    const [disputeModal, setDisputeModal] = useState<{ isOpen: boolean; orderId: string; farmerId: string }>({
        isOpen: false,
        orderId: "",
        farmerId: ""
    });

    // Update time every second to check for expiration in real-time
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    const handleConfirmDelivery = async (orderId: string) => {
        const tx = new Transaction();

        tx.moveCall({
            target: `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::confirm_delivery`,
            arguments: [
                tx.object(orderId),
                tx.object(CONSTANTS.CLOCK_OBJECT),
            ],
        });

        signAndExecute(
            { transaction: tx },
            {
                onSuccess: async (result) => {
                    console.log("Delivery confirmed:", result);
                    addToast("Processing transaction...", "info");

                    try {
                        // Wait for transaction to be confirmed
                        await client.waitForTransaction({ digest: result.digest });

                        // Sync to DB
                        await fetch('/api/orders/sync', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sui_object_id: orderId,
                                status: 2 // Transaction completed
                            })
                        });

                        addToast("Transaction completed! Funds released to farmer.", "success");
                        refetch();
                    } catch (e) {
                        console.error("Sync failed:", e);
                        addToast("Transaction confirmed but failed to update status.", "error");
                    }
                },
                onError: (e) => {
                    console.error("Confirm delivery failed:", e);
                    addToast("Failed to confirm delivery: " + e.message, "error");
                },
            }
        );
    };

    const handleRefund = async (orderId: string) => {
        try {
            await processExpiredOrder(orderId);
            
            // Sync status '3' (Refunded/Cancelled) to DB
            await fetch('/api/orders/sync', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sui_object_id: orderId,
                    status: 3 
                })
            });

            addToast("Refund successful! Funds returned to your wallet.", "success");
            refetch();
        } catch (e: any) {
            console.error(e);
            let msg = e.message || "Unknown error";
            
            // Explicitly catch the MoveAbort 5 error if it bubbled up raw
            if (msg.includes("MoveAbort") && msg.includes("5)")) {
                msg = "Order has not expired on-chain yet! Wait for the full duration (likely minutes vs hours mismatch).";
            }
            
            addToast("Refund failed: " + msg, "error");
        }
    };

    const openDisputeModal = (orderId: string, farmerId: string) => {
        setDisputeModal({ isOpen: true, orderId, farmerId });
    };

    const closeDisputeModal = () => {
        setDisputeModal({ isOpen: false, orderId: "", farmerId: "" });
    };

    const confirmDispute = async () => {
        const { orderId, farmerId } = disputeModal;
        closeDisputeModal();

        try {
            const { digest } = await createDispute(orderId);
            addToast("Dispute transaction sent. Waiting for confirmation...", "info");

            // Wait for transaction result WITH object changes
            const resultObj = await client.waitForTransaction({
                digest,
                options: {
                    showEffects: true,
                    showObjectChanges: true
                }
            });

            // Find the created Dispute object ID
            const disputeChange = resultObj.objectChanges?.find((c: unknown) => {
                const change = c as { type: string; objectType?: string };
                return change.type === 'created' && change.objectType?.includes("::Dispute");
            });

            if (disputeChange && 'objectId' in disputeChange) {
                // Sync to DB
                await fetch('/api/disputes/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        sui_object_id: (disputeChange as { objectId: string }).objectId,
                        order_id: orderId,
                        buyer: account?.address,
                        farmer: farmerId
                    })
                });
                addToast("Dispute raised successfully!", "success");
                refetch();
            } else {
                addToast("Transaction confirmed, but failed to track dispute ID.", "info");
            }

        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            console.error("Dispute error:", e);
            addToast("Failed to raise dispute: " + msg, "error");
        }
    };

    return (
        <WalletGuard
            fallback={
                <div className={styles.container}>
                    <ConnectWalletPrompt message="Connect your wallet to view your orders and manage deliveries." />
                </div>
            }
        >
            <div className={`${styles.container} page-container`}>
                <ToastContainer toasts={toasts} removeToast={removeToast} />
                <h1 className={styles.title}>Your Orders 🛒</h1>

                {isLoading ? (
                    <div className={styles.loading}>Loading orders...</div>
                ) : orders.length === 0 ? (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>📦</div>
                        <h3 className={styles.emptyText}>No Orders Yet</h3>
                        <p className={styles.emptySubtext}>You haven&apos;t placed any orders. Visit the marketplace to find fresh produce!</p>
                    </div>
                ) : (
                    <div className={styles.orderList}>
                        {orders.map((order: Order, index: number) => {
                            // Use state value for current time
                            const isExpired = Number(order.deadline) < currentTime;
                            const hasDispute = !!order.dispute;

                            return (
                                <div key={order.id} className={`${styles.orderCard} stagger-item`} style={{ animationDelay: `${index * 0.05}s` }}>
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
                                            {resolveIpfsUrl(order.product.image_url) && (
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
                                                        src={resolveIpfsUrl(order.product.image_url)}
                                                        alt={order.product.name}
                                                        fill
                                                        sizes="60px"
                                                        style={{ objectFit: 'cover' }}
                                                        unoptimized={true}
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

                                    <div className={styles.orderInfo}>
                                        <span className={styles.price}>
                                            {Number(order.total_price) / 100_000_000} TATO
                                        </span>
                                        <div>Qty: {Number(order.quantity)}</div>
                                        <div style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '4px' }}>
                                            Expected arrival: {new Date(Number(order.deadline)).toLocaleString()}
                                        </div>
                                        <span className={styles.status}>
                                            {Number(order.status) === 1 ? "In Escrow" :
                                             Number(order.status) === 2 ? "Transaction completed" : 
                                             Number(order.status) === 3 ? "Refunded" : "Unknown"}
                                        </span>
                                        {isExpired && Number(order.status) === 1 && (
                                            <div style={{ color: '#e74c3c', fontSize: '0.8rem', marginTop: '4px', fontWeight: 'bold' }}>
                                                ⚠️ Expired
                                            </div>
                                        )}
                                        {hasDispute && (
                                            <div style={{ color: '#f39c12', fontSize: '0.8rem', marginTop: '4px', fontWeight: 'bold' }}>
                                                ⚖️ Dispute Active
                                            </div>
                                        )}
                                    </div>

                                    <div className={styles.actionArea}>
                                        {/* Only show confirm button if status is Escrowed (1) AND NOT expired AND NO dispute */}
                                        {Number(order.status) === 1 && !isExpired && !hasDispute && (
                                            <>
                                                <button
                                                    className={styles.confirmBtn}
                                                    onClick={() => handleConfirmDelivery(order.id)}
                                                >
                                                    Confirm Delivery
                                                </button>

                                                <button
                                                    className={styles.disputeBtn}
                                                    onClick={() => openDisputeModal(order.id, order.farmer)}
                                                    disabled={isDisputing}
                                                >
                                                    {isDisputing ? "Processing..." : "Raise Dispute"}
                                                </button>
                                            </>
                                        )}

                                        {/* Show Refund button if Escrowed (1) AND Expired */}
                                        {Number(order.status) === 1 && isExpired && !hasDispute && (
                                            <button
                                                className={styles.confirmBtn}
                                                onClick={() => handleRefund(order.id)}
                                                style={{ backgroundColor: '#e74c3c' }}
                                                disabled={isRefunding}
                                            >
                                                {isRefunding ? "Processing..." : "Refund (Expired)"}
                                            </button>
                                        )}
                                    </div>

                                    {/* Show Dispute Negotiation UI if dispute exists */}
                                    {hasDispute && (
                                        <DisputeSection order={order} onUpdate={refetch} />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}

                {/* Confirm Modal for Dispute */}
                <ConfirmModal
                    isOpen={disputeModal.isOpen}
                    title="⚠️ Raise Dispute"
                    message="Are you sure you want to raise a dispute? This will involve the community in resolving this issue. This action cannot be undone."
                    onClose={closeDisputeModal}
                    onConfirm={confirmDispute}
                    isLoading={isDisputing}
                />
            </div>
        </WalletGuard>
    );
}
