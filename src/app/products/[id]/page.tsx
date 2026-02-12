"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONSTANTS } from "@/lib/constants";
import { useToast, ToastContainer } from "@/components/Toast";
import styles from "./page.module.css";

// Interface matching API response
interface ProductDetail {
    sui_object_id: string;
    name: string;
    price_per_unit: string;
    stock: string;
    farmer_address: string;
    image_url: string;
    description: string;
    category: string;
    fulfillment_time: string;
}

export default function ProductDetailPage() {
    const params = useParams();
    const router = useRouter();
    const account = useCurrentAccount();
    const { toasts, addToast, removeToast } = useToast();

    const [product, setProduct] = useState<ProductDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [isOrdering, setIsOrdering] = useState(false);

    useEffect(() => {
        const fetchProduct = async () => {
            try {
                const response = await fetch(`/api/products/${params.id}`);
                const data = await response.json();

                if (data.success) {
                    setProduct(data.product);
                } else {
                    addToast(data.error || "Failed to load product", "error");
                }
            } catch (error) {
                console.error("Error fetching product:", error);
                addToast("Error loading product details", "error");
            } finally {
                setIsLoading(false);
            }
        };

        if (params.id) {
            fetchProduct();
        }
    }, [params.id]);

    // Need client and signAndExecute for transaction
    const client = useSuiClient();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();

    const handleBuy = async () => {
        if (!account) {
            addToast("Please connect your wallet to buy items.", "warning");
            return;
        }

        if (!product) return;

        try {
            setIsOrdering(true);
            // 1. Fetch user's TATO coins
            const { data: coins } = await client.getCoins({
                owner: account.address,
                coinType: CONSTANTS.COIN_TYPE,
            });

            if (coins.length === 0) {
                addToast("You don't have any TATO tokens! Use the faucet.", "error");
                setIsOrdering(false);
                return;
            }

            // 2. Prepare Transaction
            const tx = new Transaction();

            // Calculate total price for requested quantity
            const price = BigInt(product.price_per_unit) * BigInt(quantity);

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
                setIsOrdering(false);
                return;
            }

            // Split the exact amount for payment
            const [coinToPay] = tx.splitCoins(paymentCoin, [price]);

            // 3. Call create_order
            const deadlineHours = Number(product.fulfillment_time) || 24;
            tx.moveCall({
                target: `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::create_order`,
                arguments: [
                    tx.object(product.sui_object_id),        // product
                    tx.pure.u64(quantity),                   // quantity
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
                                    product_id: product.sui_object_id,
                                    buyer: account.address,
                                    farmer: product.farmer_address,
                                    quantity: quantity.toString(),
                                    total_price: price.toString(),
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

                                // Redirect to buyer dashboard or refresh logic
                                setTimeout(() => router.push('/buyer'), 2000);
                            } else {
                                console.warn("Could not find created Order object in transaction changes.");
                            }
                        } catch (e) {
                            console.error("Wait/Sync error", e);
                            addToast("Transaction confirmed but sync failed.", "warning");
                        } finally {
                            setIsOrdering(false);
                        }
                    },
                    onError: (err) => {
                        console.error(err);
                        addToast("Transaction failed: " + err.message, "error");
                        setIsOrdering(false);
                    },
                }
            );

        } catch (e: unknown) {
            console.error(e);
            const msg = e instanceof Error ? e.message : "Unknown error";
            addToast("Error: " + msg, "error");
            setIsOrdering(false);
        }
    };

    if (isLoading) return <div className={styles.loading}>Loading product details...</div>;
    if (!product) return <div className={styles.error}>Product not found</div>;

    return (
        <div className={styles.container}>
            <ToastContainer toasts={toasts} removeToast={removeToast} />

            <div className={styles.content}>
                <button onClick={() => router.back()} className={styles.backBtn}>
                    ← Back to Marketplace
                </button>

                <div className={styles.productGrid}>
                    {/* Left Column: Image */}
                    <div className={styles.imageContainer}>
                        <div className={styles.imageWrapper}>
                            <Image
                                src={product.image_url}
                                alt={product.name}
                                fill
                                style={{ objectFit: "cover" }}
                                className={styles.productImage}
                                unoptimized={true} // Handle external IPFS
                            />
                        </div>
                    </div>

                    {/* Right Column: Details */}
                    <div className={styles.detailsContainer}>
                        <h1 className={styles.title}>{product.name}</h1>
                        <p className={styles.category}>{product.category}</p>

                        <div className={styles.priceBlock}>
                            <span className={styles.price}>
                                {(Number(product.price_per_unit) / 100_000_000).toLocaleString()} TATO
                            </span>
                            <span className={styles.perUnit}> / unit</span>
                        </div>

                        <div className={styles.infoGrid}>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Stock</span>
                                <span className={styles.value}>{Number(product.stock).toLocaleString()}</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Fulfillment</span>
                                <span className={styles.value}>{product.fulfillment_time} hours</span>
                            </div>
                            <div className={styles.infoItem}>
                                <span className={styles.label}>Farmer</span>
                                <span className={styles.value} title={product.farmer_address}>
                                    {product.farmer_address.slice(0, 6)}...{product.farmer_address.slice(-4)}
                                </span>
                            </div>
                        </div>

                        <div className={styles.description}>
                            <h3>Description</h3>
                            <p>{product.description}</p>
                        </div>

                        <div className={styles.actions}>

                            <div className={styles.quantitySelector} style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span className={styles.label}>Quantity:</span>
                                <button
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                    style={{ padding: '5px 10px', cursor: 'pointer' }}
                                >-</button>
                                <input
                                    type="number"
                                    min="1"
                                    max={Number(product.stock)}
                                    value={quantity}
                                    onChange={(e) => setQuantity(Math.max(1, Math.min(Number(product.stock), Number(e.target.value))))}
                                    style={{ width: '60px', textAlign: 'center', padding: '5px' }}
                                />
                                <button
                                    onClick={() => setQuantity(Math.min(Number(product.stock), quantity + 1))}
                                    style={{ padding: '5px 10px', cursor: 'pointer' }}
                                >+</button>
                            </div>

                            <button
                                className={styles.buyBtn}
                                onClick={handleBuy}
                                disabled={Number(product.stock) <= 0 || isOrdering}
                            >
                                {Number(product.stock) > 0 ? `Buy Now (${(Number(product.price_per_unit) * quantity / 100_000_000).toLocaleString()} TATO)` : "Out of Stock"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
}
