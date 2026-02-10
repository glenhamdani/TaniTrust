"use client";

import { useProducts } from "@/hooks/useProducts";
import { ProductCard } from "@/components/ProductCard";
import styles from "./Marketplace.module.css";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONSTANTS } from "@/lib/constants";
import { useState } from "react";

import { ConnectWalletPrompt } from "@/components/ConnectWalletPrompt";

export default function Marketplace() {
    const { products, isLoading, error } = useProducts();
    const account = useCurrentAccount();
    const client = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const [buyingId, setBuyingId] = useState<string | null>(null);

    const handleBuy = async (product: any) => {
        if (!account) {
            alert("Please connect your wallet to buy items."); // Keep alert for action attempt, or use modal. For now, we'll stick to alert as user can browse.
            return;
        }

        setBuyingId(product.id);

        try {
            // 1. Fetch user's TATO coins
            const { data: coins } = await client.getCoins({
                owner: account.address,
                coinType: CONSTANTS.COIN_TYPE,
            });

            if (coins.length === 0) {
                alert("You don't have any TATO tokens! Use the faucet.");
                setBuyingId(null);
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
                setBuyingId(null);
                return;
            }

            // Split the exact amount for payment
            const [coinToPay] = tx.splitCoins(paymentCoin, [price]); // quantity 1

            // 3. Call create_order
            tx.moveCall({
                target: `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::create_order`,
                arguments: [
                    tx.object(product.id),        // product
                    tx.pure.u64(1),               // quantity (hardcoded 1 for now)
                    tx.pure.u64(24),              // deadline_hours
                    coinToPay,                    // payment
                    tx.object("0x6"),             // clock
                ],
            });

            // 4. Execute
            signAndExecute(
                {
                    transaction: tx,
                },
                {
                    onSuccess: (result) => {
                        console.log("Order created:", result);
                        alert("Order successful! Check your Buyer Dashboard.");
                        setBuyingId(null);
                    },
                    onError: (err) => {
                        console.error(err);
                        alert("Transaction failed: " + err.message);
                        setBuyingId(null);
                    },
                }
            );

        } catch (e: any) {
            console.error(e);
            alert("Error: " + e.message);
            setBuyingId(null);
        }
    };

    if (isLoading) return <div className={styles.loading}>Loading market data...</div>;
    if (error) return <div className={styles.error}>Error loading products: {error.message}</div>;

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <h1 className={styles.title}>Marketplace</h1>
                <p className={styles.subtitle}>Fresh products directly from verified farmers</p>
            </header>

            {products.length === 0 ? (
                <div className={styles.empty}>No products found. Be the first farmer to list something!</div>
            ) : (
                <div className={styles.grid}>
                    {products.map((p: any) => (
                        <ProductCard
                            key={p.id}
                            product={p}
                            onBuy={handleBuy}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
