import { useState, useEffect } from "react";
import styles from "./BuyQuantityModal.module.css";
import { Product } from "@/hooks/useProducts";

interface BuyQuantityModalProps {
    isOpen: boolean;
    product: Product | null;
    onClose: () => void;
    onConfirm: (product: Product, quantity: number) => void;
    isLoading?: boolean;
}

export function BuyQuantityModal({ isOpen, product, onClose, onConfirm, isLoading }: BuyQuantityModalProps) {
    const [quantity, setQuantity] = useState(1);

    // Reset quantity when modal opens for a new product
    useEffect(() => {
        if (isOpen) setQuantity(1);
    }, [isOpen, product]);

    if (!isOpen || !product) return null;

    const maxStock = Number(product.stock);
    const pricePerUnit = Number(product.price) / 100_000_000;
    const totalPrice = pricePerUnit * quantity;

    const handleIncrement = () => {
        setQuantity(prev => Math.min(prev + 1, maxStock));
    };

    const handleDecrement = () => {
        setQuantity(prev => Math.max(prev - 1, 1));
    };

    const handleConfirm = () => {
        onConfirm(product, quantity);
    };

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Buy Product</h3>
                    <div className={styles.productName}>{product.name}</div>
                </div>

                <div className={styles.content}>
                    <div className={styles.priceInfo}>
                        <span className={styles.priceLabel}>Price per unit:</span>
                        <span className={styles.priceValue}>{pricePerUnit.toLocaleString()} TATO</span>
                    </div>

                    <div className={styles.quantityControl}>
                        <span className={styles.label}>Quantity</span>
                        <div className={styles.quantityWrapper}>
                            <button
                                className={styles.quantityBtn}
                                onClick={handleDecrement}
                                disabled={quantity <= 1}
                            >-</button>
                            <input
                                type="number"
                                className={styles.quantityInput}
                                value={quantity}
                                readOnly // Make read-only to prevent invalid inputs for now, user can use +/-
                            />
                            <button
                                className={styles.quantityBtn}
                                onClick={handleIncrement}
                                disabled={quantity >= maxStock}
                            >+</button>
                        </div>
                    </div>

                    <div className={styles.priceInfo} style={{ background: '#ecfdf5', border: '1px solid #d1fae5' }}>
                        <span className={styles.priceLabel} style={{ color: '#047857', fontWeight: 600 }}>Total:</span>
                        <span className={styles.priceValue} style={{ color: '#059669', fontSize: '1.2rem' }}>
                            {totalPrice.toLocaleString()} TATO
                        </span>
                    </div>
                </div>

                <div className={styles.buttons}>
                    <button
                        className={`${styles.button} ${styles.cancelBtn}`}
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        className={`${styles.button} ${styles.confirmBtn}`}
                        onClick={handleConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? "Processing..." : "Confirm Purchase"}
                    </button>
                </div>
            </div>
        </div>
    );
}
