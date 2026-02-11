import { useState, useRef } from "react";
import styles from "./Toast.module.css";

// Tipe notifikasi
type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
    id: string;
    message: string;
    type: ToastType;
}

// Hook untuk menggunakan Toast
export function useToast() {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const toastIdRef = useRef(0);

    const addToast = (message: string, type: ToastType) => {
        toastIdRef.current += 1;
        const id = toastIdRef.current.toString();
        setToasts((prev) => [...prev, { id, message, type }]);

        // Auto remove after 5 seconds
        setTimeout(() => removeToast(id), 5000);
    };

    const removeToast = (id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    };

    return { toasts, addToast, removeToast };
}

// Komponen untuk menampilkan Toast
export function ToastContainer({ toasts, removeToast }: { toasts: ToastItem[]; removeToast: (id: string) => void }) {
    if (toasts.length === 0) return null;

    return (
        <div className={styles.toastContainer}>
            {toasts.map((toast) => (
                <div key={toast.id} className={`${styles.toast} ${styles[toast.type]}`}>
                    <span>{toast.message}</span>
                    <button onClick={() => removeToast(toast.id)} className={styles.closeBtn}>
                        &times;
                    </button>
                </div>
            ))}
        </div>
    );
}
