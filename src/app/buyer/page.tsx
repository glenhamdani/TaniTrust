"use client";

import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONSTANTS } from "@/lib/constants";
import styles from "./buyer.module.css";
import { useOrders } from "@/hooks/useOrders";
import { ConnectWalletPrompt } from "@/components/ConnectWalletPrompt";

export default function BuyerDashboard() {
    const account = useCurrentAccount();
    const { orders, isLoading, refetch } = useOrders();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();

    const handleConfirmDelivery = (orderId: string) => {
        const tx = new Transaction();

        tx.moveCall({
            target: `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::confirm_delivery`,
            arguments: [
                tx.object(orderId),
                tx.object("0x6"), // Clock
            ],
        });

        signAndExecute(
            { transaction: tx },
            {
                onSuccess: () => {
                    alert("Delivery confirmed! Funds released to farmer.");
                    refetch();
                },
                onError: (e) => alert(e.message),
            }
        );
    };

    if (!account) {
        return <div className={styles.container}><ConnectWalletPrompt message="Connect your wallet to view your orders and manage deliveries." /></div>;
    }

    if (isLoading) return <div className={styles.container}>Loading orders...</div>;

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Your Orders 🛒</h1>

            {orders.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>📦</div>
                    <h3 className={styles.emptyText}>No Orders Yet</h3>
                    <p className={styles.emptySubtext}>You haven't placed any orders. Visit the marketplace to find fresh produce!</p>
                </div>
            ) : (
                <div className={styles.orderList}>
                    {orders.map((order) => (
                        <div key={order.id} className={styles.orderCard}>
                            <div className={styles.orderInfo}>
                                <span className={styles.orderId}>Order ID: {order.id.slice(0, 8)}...</span>
                                <span className={styles.price}>
                                    {Number(order.total_price) / 100_000_000} TATO
                                </span>
                                <div>Qty: {Number(order.quantity)}</div>
                                <span className={styles.status}>
                                    {order.status === 1 ? "In Escrow" : "Completed"}
                                </span>
                            </div>

                            <div className={styles.actionArea}>
                                {/* Only show confirm button if status is Escrowed (1) */}
                                {order.status === 1 && (
                                    <button
                                        className={styles.confirmBtn}
                                        onClick={() => handleConfirmDelivery(order.id)}
                                    >
                                        Confirm Delivery
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
