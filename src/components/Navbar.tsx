"use client";

import Link from "next/link";
import { ConnectButton } from "@mysten/dapp-kit";
import styles from "./Navbar.module.css";

export function Navbar() {
    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <Link href="/" className={styles.logo}>
                    🌾 TaniTrust
                </Link>

                <div className={styles.links}>
                    <Link href="/marketplace" className={styles.link}>
                        Marketplace
                    </Link>
                    <Link href="/farmer" className={styles.link}>
                        Petani
                    </Link>
                    <Link href="/buyer" className={styles.link}>
                        Pembeli
                    </Link>
                    <div className={styles.walletWrapper}>
                        <ConnectButton />
                    </div>
                </div>
            </div>
        </nav>
    );
}
