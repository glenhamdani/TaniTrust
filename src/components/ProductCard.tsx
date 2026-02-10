"use client";

import styles from "./ProductCard.module.css";
import { CONSTANTS } from "@/lib/constants";

type Product = {
    id: string;
    name: string;
    price: bigint;
    stock: bigint;
    farmer: string;
};

interface ProductCardProps {
    product: Product;
    onBuy: (product: Product) => void;
}

export function ProductCard({ product, onBuy }: ProductCardProps) {
    // Helper to format price (assuming 8 decimals like TATO)
    const formatPrice = (price: bigint) => {
        const p = Number(price) / 100_000_000;
        return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    return (
        <div className={styles.card}>
            <div className={styles.image}>
                🌾
            </div>
            <div className={styles.content}>
                <h3 className={styles.title}>{product.name}</h3>
                <p className={styles.farmer} title={product.farmer}>
                    By: {product.farmer.slice(0, 6)}...{product.farmer.slice(-4)}
                </p>
                <div className={styles.details}>
                    <span className={styles.price}>{formatPrice(product.price)} TATO</span>
                    <span className={styles.stock}>{Number(product.stock)} Left</span>
                </div>
                <button
                    className={styles.buyBtn}
                    onClick={() => onBuy(product)}
                    disabled={product.stock <= BigInt(0)}
                >
                    {product.stock > BigInt(0) ? "Buy Now" : "Out of Stock"}
                </button>
            </div>
        </div>
    );
}
