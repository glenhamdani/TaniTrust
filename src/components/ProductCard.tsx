"use client";

import styles from "./ProductCard.module.css";
import NextImage from "next/image";
import Link from "next/link";
import { Product } from "@/hooks/useProducts";

import { resolveIpfsUrl } from "@/lib/ipfs";

interface ProductCardProps {
    product: Product & { imageUrl?: string }; // Make strict
    onBuy: (product: Product) => void;
}

export function ProductCard({ product, onBuy }: ProductCardProps) {
    // Helper to format price (assuming 8 decimals like TATO)
    const formatPrice = (price: bigint) => {
        const p = Number(price) / 100_000_000;
        return p.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const imageUrl = resolveIpfsUrl(product.imageUrl);

    return (
        <Link href={`/products/${product.id}`} className={styles.cardLink}>
            <div className={styles.card}>
                <div className={styles.imageContainer}>
                    {imageUrl ? (
                        <div className={styles.imageWrapper}>
                            <NextImage
                                src={imageUrl}
                                alt={product.name}
                                fill
                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                                className={styles.productImage}
                                unoptimized={true} // Bypass Next.js optimization to avoid server-side rate limits
                            />
                        </div>
                    ) : (
                        <div className={styles.placeholderImage}>🌾</div>
                    )}
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
                        onClick={(e) => {
                            e.preventDefault(); // Prevent navigation when clicking buy
                            onBuy(product);
                        }}
                        disabled={product.stock <= BigInt(0)}
                    >
                        {product.stock > BigInt(0) ? "Buy Now" : "Out of Stock"}
                    </button>
                </div>
            </div>
        </Link>
    );
}
