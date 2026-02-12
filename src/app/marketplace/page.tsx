"use client";

import { useProducts, Product } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import styles from "./Marketplace.module.css";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONSTANTS } from "@/lib/constants";
import { useToast, ToastContainer } from "@/components/Toast";
import { BuyQuantityModal } from "@/components/BuyQuantityModal";
import { useState } from "react";
import { PRODUCT_CATEGORIES } from "@/types/product";

export default function Marketplace() {
    const [selectedCategory, setSelectedCategory] = useState<string | undefined>(undefined);
    const { products, isLoading, error, refetch } = useProducts(selectedCategory);

    // ... existing hooks ...
    const { toasts, addToast, removeToast } = useToast();
    const account = useCurrentAccount();
    const client = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();

    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [isBuyModalOpen, setIsBuyModalOpen] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // ... existing handlers ...

    // Filter Handler
    const handleCategoryChange = (category: string | undefined) => {
        setSelectedCategory(category);
        // Optional: Reset pagination or scroll to top here if needed
    };

    // Open Modal
    const handleBuyClick = (product: Product) => {
        setSelectedProduct(product);
        setIsBuyModalOpen(true);
    };

    // Close Modal
    const handleCloseModal = () => {
        setIsBuyModalOpen(false);
        setSelectedProduct(null);
    };

    // Execute Transaction
    const handleConfirmPurchase = async (product: Product, quantity: number) => {
        if (!account) {
            addToast("Please connect your wallet to buy items.", "warning");
            return;
        }

        setIsProcessing(true);

        try {
            // 1. Fetch user's TATO coins
            const { data: coins } = await client.getCoins({
                owner: account.address,
                coinType: CONSTANTS.COIN_TYPE,
            });

            if (coins.length === 0) {
                addToast("You don't have any TATO tokens! Use the faucet.", "error");
                setIsProcessing(false);
                return;
            }

            // 2. Prepare Transaction
            const tx = new Transaction();

            // Calculate total price for requested quantity
            const price = BigInt(product.price) * BigInt(quantity);

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
                addToast(`Insufficient TATO balance. Needed: ${Number(price) / 100_000_000}, Have: ${Number(totalBalance) / 100_000_000}`, "error");
                setIsProcessing(false);
                return;
            }

            // Split the exact amount for payment
            const [coinToPay] = tx.splitCoins(paymentCoin, [price]);

            // 3. Call create_order
            const deadlineMinutes = product.fulfillment_time || 60;
            tx.moveCall({
                target: `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::create_order`,
                arguments: [
                    tx.object(product.id),
                    tx.pure.u64(quantity),
                    coinToPay,
                    tx.object(CONSTANTS.CLOCK_OBJECT),
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
                        handleCloseModal(); // Close modal immediately on success

                        try {
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
                                    quantity: quantity.toString(),
                                    total_price: price.toString(),
                                    deadline: (Date.now() + (deadlineMinutes * 60 * 60 * 1000)).toString(),
                                    status: 1
                                };

                                const syncRes = await fetch('/api/orders/sync', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(syncData)
                                });

                                if (!syncRes.ok) {
                                    const errData = await syncRes.json().catch(() => ({}));
                                    console.error("Sync Failed:", errData);
                                    throw new Error("DB Sync Failed");
                                }

                                const savedOrder = await syncRes.json();
                                console.log("✅ Order Synced to DB:", savedOrder);
                            }

                            refetch();
                        } catch (e) {
                            console.error("Wait/Sync error", e);
                            addToast("Transaction confirmed but sync failed.", "warning");
                        } finally {
                            setIsProcessing(false);
                        }
                    },
                    onError: (err) => {
                        console.error(err);
                        addToast("Transaction failed: " + err.message, "error");
                        setIsProcessing(false);
                    },
                }
            );

        } catch (e: unknown) {
            console.error(e);
            const msg = e instanceof Error ? e.message : "Unknown error";
            addToast("Error: " + msg, "error");
            setIsProcessing(false);
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

            {/* Category Filter */}
            <div className={styles.filterBar}>
                <button
                    className={`${styles.filterBtn} ${!selectedCategory ? styles.active : ''}`}
                    onClick={() => handleCategoryChange(undefined)}
                >
                    All
                </button>
                {PRODUCT_CATEGORIES.map((cat) => (
                    <button
                        key={cat}
                        className={`${styles.filterBtn} ${selectedCategory === cat ? styles.active : ''}`}
                        onClick={() => handleCategoryChange(cat)}
                    >
                        {cat}
                    </button>
                ))}
            </div>

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
                                onBuy={handleBuyClick}
                            />
                        </div>
                    ))}
                </div>
            )}

            <BuyQuantityModal
                isOpen={isBuyModalOpen}
                product={selectedProduct}
                onClose={handleCloseModal}
                onConfirm={handleConfirmPurchase}
                isLoading={isProcessing}
            />
        </div>
    );
}
