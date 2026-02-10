"use client";

import { ConnectButton } from "@mysten/dapp-kit";
import styles from "./ConnectWalletPrompt.module.css";

export function ConnectWalletPrompt({ message = "Please connect your wallet to continue." }: { message?: string }) {
    return (
        <div className={styles.container}>
            <div className={styles.icon}>👛</div>
            <h2 className={styles.title}>Wallet Not Connected</h2>
            <p className={styles.description}>{message}</p>
            <ConnectButton />
        </div>
    );
}
