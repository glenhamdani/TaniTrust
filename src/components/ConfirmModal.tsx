import styles from "./ConfirmModal.module.css";
import React from "react";

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onClose: () => void;
    onConfirm: () => void;
    isLoading?: boolean;
}

export function ConfirmModal({ isOpen, title, message, onClose, onConfirm, isLoading }: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className={styles.overlay}>
            <div className={styles.modal}>
                <h3 className={styles.title}>{title}</h3>
                <p className={styles.message}>{message}</p>
                <div className={styles.buttons}>
                    <button onClick={onClose} className={`${styles.button} ${styles.cancelBtn}`} disabled={isLoading}>
                        Cancel
                    </button>
                    <button onClick={onConfirm} className={`${styles.button} ${styles.confirmBtn}`} disabled={isLoading}>
                        {isLoading ? "Deleting..." : "Delete Permanently"}
                    </button>
                </div>
            </div>
        </div>
    );
}
