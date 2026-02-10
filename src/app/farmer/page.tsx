"use client";

import { useState } from "react";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONSTANTS } from "@/lib/constants";
import styles from "./farmer.module.css";
import { useProducts } from "@/hooks/useProducts";
import { ConnectWalletPrompt } from "@/components/ConnectWalletPrompt";

export default function FarmerDashboard() {
    const account = useCurrentAccount();
    const { mutate: signAndExecute } = useSignAndExecuteTransaction();
    const { products } = useProducts();

    const [formData, setFormData] = useState({
        name: "",
        price: "",
        stock: "",
    });

    const handleUpload = () => {
        if (!account) return alert("Connect wallet!");

        const tx = new Transaction();
        const priceInUnits = BigInt(Math.floor(Number(formData.price) * 100_000_000)); // Convert to 8 decimals

        tx.moveCall({
            target: `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::upload_product`,
            arguments: [
                tx.pure.string(formData.name),
                tx.pure.u64(priceInUnits),
                tx.pure.u64(Number(formData.stock)),
            ],
        });

        signAndExecute(
            { transaction: tx },
            {
                onSuccess: () => {
                    alert("Product uploaded!");
                    setFormData({ name: "", price: "", stock: "" });
                },
                onError: (e) => alert(e.message),
            }
        );
    };

    // Filter products by current user
    const myProducts = products.filter(p => p.farmer === account?.address);

    if (!account) {
        return <div className={styles.container}><ConnectWalletPrompt message="Connect your wallet to listing products and manage inventory." /></div>;
    }

    return (
        <div className={styles.container}>
            <h1 className={styles.title}>Farmer Dashboard 👨‍🌾</h1>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>Upload New Product</h2>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Product Name</label>
                    <input
                        className={styles.input}
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g. Organic Rice"
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Price (TATO)</label>
                    <input
                        className={styles.input}
                        type="number"
                        value={formData.price}
                        onChange={e => setFormData({ ...formData, price: e.target.value })}
                        placeholder="Amount in TATO"
                    />
                </div>
                <div className={styles.formGroup}>
                    <label className={styles.label}>Stock</label>
                    <input
                        className={styles.input}
                        type="number"
                        value={formData.stock}
                        onChange={e => setFormData({ ...formData, stock: e.target.value })}
                        placeholder="Quantity"
                    />
                </div>
                <button className={styles.button} onClick={handleUpload}>Upload Product</button>
            </div>

            <div className={styles.section}>
                <h2 className={styles.sectionTitle}>My Products</h2>
                {myProducts.length === 0 ? <p>No products listed yet.</p> : (
                    <div className={styles.productList}>
                        {myProducts.map(p => (
                            <div key={p.id} className={styles.productItem}>
                                <div>
                                    <strong>{p.name}</strong>
                                    <div>Stock: {Number(p.stock)}</div>
                                </div>
                                <div>{Number(p.price) / 100_000_000} TATO</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
