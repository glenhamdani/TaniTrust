"use client";

import { useState } from "react";
import { useUpdateStock } from "@/hooks/useUpdateStock";
import styles from "./UpdateStockModal.module.css";

interface UpdateStockModalProps {
  productId: string;
  productName: string;
  currentStock: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function UpdateStockModal({
  productId,
  productName,
  currentStock,
  onClose,
  onSuccess,
}: UpdateStockModalProps) {
  const [newStock, setNewStock] = useState(currentStock.toString());
  const { updateStock, isUpdating } = useUpdateStock();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const stockValue = parseInt(newStock);
    if (isNaN(stockValue) || stockValue < 0) {
      alert("Please enter a valid stock number");
      return;
    }

    try {
      await updateStock(productId, stockValue);
      alert("Stock updated successfully!");
      onSuccess();
      onClose();
    } catch (error) {
      alert(`Failed to update stock: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h3>Update Stock</h3>
          <button className={styles.closeBtn} onClick={onClose} type="button">
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.content}>
            <div className={styles.productInfo}>
              <strong>{productName}</strong>
              <span className={styles.currentStock}>
                Current Stock: {currentStock} kg
              </span>
            </div>

            <div className={styles.formGroup}>
              <label htmlFor="newStock">New Stock (kg)</label>
              <input
                type="number"
                id="newStock"
                value={newStock}
                onChange={(e) => setNewStock(e.target.value)}
                min="0"
                required
                disabled={isUpdating}
                placeholder="Enter new stock amount"
              />
            </div>
          </div>

          <div className={styles.footer}>
            <button
              type="button"
              onClick={onClose}
              className={styles.cancelBtn}
              disabled={isUpdating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitBtn}
              disabled={isUpdating}
            >
              {isUpdating ? "Updating..." : "Update Stock"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
