"use client";

import { useProducts, Product } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import styles from "./Marketplace.module.css";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONSTANTS } from "@/lib/constants";

import { useToast, ToastContainer } from "@/components/Toast";

export default function Marketplace() {
    const { products, isLoading, error, refetch } = useProducts();
    const { toasts, addToast, removeToast } = useToast();
    const account = useCurrentAccount();
    const client = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();

    const handleBuy = async (product: Product) => {
        if (!account) {
            alert("Please connect your wallet to buy items.");
            return;
        }

        try {
            // 1. Fetch user's TATO coins
            const { data: coins } = await client.getCoins({
                owner: account.address,
                coinType: CONSTANTS.COIN_TYPE,
            });

            if (coins.length === 0) {
                alert("You don't have any TATO tokens! Use the faucet.");
                return;
            }

            // 2. Prepare Transaction
            const tx = new Transaction();

            // Calculate total price for 1 unit
            const price = BigInt(product.price);

            // Filter coins with balance > 0
            const validCoins = coins.filter(c => BigInt(c.balance) > BigInt(0));
            if (validCoins.length === 0) throw new Error("No TATO balance");

            // Merge coins if needed
            if (validCoins.length > 1) {
                tx.mergeCoins(
                    tx.object(validCoins[0].coinObjectId),
                    validCoins.slice(1).map(c => tx.object(c.coinObjectId))
                );
            }

            const paymentCoin = tx.object(validCoins[0].coinObjectId);

            // Verify balance (client side check)
            const totalBalance = validCoins.reduce((acc, c) => acc + BigInt(c.balance), BigInt(0));
            if (totalBalance < price) {
                alert(`Insufficient TATO balance. Needed: ${Number(price) / 100_000_000}, Have: ${Number(totalBalance) / 100_000_000}`);
                return;
            }

            // Split the exact amount for payment
            const [coinToPay] = tx.splitCoins(paymentCoin, [price]); // quantity 1

            // 3. Call create_order
            const deadlineHours = product.fulfillment_time || 24;
            tx.moveCall({
                target: `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::create_order`,
                arguments: [
                    tx.object(product.id),        // product
                    tx.pure.u64(1),               // quantity (hardcoded 1 for now)
                    tx.pure.u64(deadlineHours),   // deadline_hours
                    coinToPay,                    // payment
                    tx.object(CONSTANTS.CLOCK_OBJECT), // clock 0x6
                ],
            });

            // 4. Execute
            signAndExecute(
                {
                    transaction: tx,
                },
                {
                    onSuccess: async (result) => {
                        console.log("Order created:", result);
                        addToast("Transaction sent. Waiting for confirmation...", "info");

                        try {
                            // Wait for transaction result WITH object changes
                            const resultObj = await client.waitForTransaction({
                                digest: result.digest,
                                options: {
                                    showEffects: true,
                                    showObjectChanges: true,
                                    showEvents: true
                                }
                            });

                            addToast("✅ Order successful! Syncing...", "success");

                            // Find the created Order object ID
                            const orderChange = resultObj.objectChanges?.find((c: any) =>
                                c.type === 'created' && c.objectType.includes("::Order")
                            );

                            if (orderChange && 'objectId' in orderChange) {
                                // Sync to DB
                                const syncData = {
                                    sui_object_id: orderChange.objectId,
                                    product_id: product.id,
                                    buyer: account.address,
                                    farmer: product.farmer,
                                    quantity: "1", // Hardcoded quantity for now
                                    total_price: product.price.toString(),
                                    deadline: (Date.now() + (deadlineHours * 60 * 60 * 1000)).toString(), // Est. Deadline from client clock
                                    status: 1 // Escrowed
                                };

                                const syncRes = await fetch('/api/orders/sync', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(syncData)
                                });

                                if (!syncRes.ok) {
                                    const errData = await syncRes.json().catch(() => ({}));
                                    console.error("Sync Failed:", errData);
                                    throw new Error("DB Sync Failed: " + (errData.error || syncRes.statusText));
                                }

                                const savedOrder = await syncRes.json();
                                console.log("✅ Order Synced to DB:", savedOrder);
                            } else {
                                console.warn("Could not find created Order object in transaction changes.");
                            }

                            // Force refetch to update UI
                            refetch();
                        } catch (e) {
                            console.error("Wait/Sync error", e);
                            addToast("Transaction confirmed but sync failed.", "warning");
                        }
                    },
                    onError: (err) => {
                        console.error(err);
                        addToast("Transaction failed: " + err.message, "error");
                    },
                }
            );

        } catch (e: unknown) {
            console.error(e);
            const msg = e instanceof Error ? e.message : "Unknown error";
            addToast("Error: " + msg, "error");
        }
    };

    if (isLoading) return <div className={styles.loading}>Loading market data...</div>;
    // Just simpler error check
    if (error) return <div className={styles.error}>Error loading products: {String(error)}</div>;

    return (
        <div className={`${styles.container} page-container`}>
            <ToastContainer toasts={toasts} removeToast={removeToast} />
            <header className={styles.header}>
                <h1 className={styles.title}>Marketplace</h1>
                <p className={styles.subtitle}>Fresh products directly from verified farmers</p>
            </header>

            {products.length === 0 ? (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>🌾</div>
                    <h2 className={styles.emptyTitle}>No Products Available</h2>
                    <p className={styles.emptyDescription}>
                        The marketplace is currently empty. Be the first farmer to list your fresh produce!
                    </p>
                    <p className={styles.emptyHint}>
                        Farmers can upload products from the <strong>Farmer Dashboard</strong>
                    </p>
                </div>
            ) : (
                <div className={styles.grid}>
                    {products.map((p, index) => (
                        <div key={p.id} className="stagger-item" style={{ animationDelay: `${index * 0.05}s` }}>
                            <ProductCard
                                product={p}
                                onBuy={handleBuy}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
