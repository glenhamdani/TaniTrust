"use client";

import Link from "next/link";
import {
    ConnectButton,
    useCurrentAccount,
    useSuiClientQuery,
    useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import styles from "./Navbar.module.css";
import { CONSTANTS } from "../constants";

export function Navbar() {
    const account = useCurrentAccount();
    const { mutate: signAndExecuteTransaction } =
        useSignAndExecuteTransaction();

    const { data: balanceData, refetch: refetchBalance } = useSuiClientQuery(
        "getBalance",
        {
            owner: account?.address as string,
            coinType: CONSTANTS.COIN_TYPE,
        },
        {
            enabled: !!account,
        }
    );

    const handleClaimFaucet = () => {
        if (!account) return;
        const tx = new Transaction();
        tx.moveCall({
            target: `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.TOKEN_MODULE}::claim_faucet`,
            arguments: [tx.object(CONSTANTS.TREASURY_CAP)],
        });

        signAndExecuteTransaction(
            { transaction: tx },
            {
                onSuccess: () => {
                    setTimeout(refetchBalance, 2000);
                },
                onError: (err) => {
                    console.error("Faucet claim failed", err);
                },
            }
        );
    };

    const balance = balanceData
        ? (Number(balanceData.totalBalance) / 100_000_000).toFixed(2)
        : "0.00";

    return (
        <nav className={styles.navbar}>
            <div className={styles.container}>
                <div className={styles.leftSection}>
                    <Link href="/" className={styles.logo}>
                        🌾 TaniTrust
                    </Link>

                    <div className={styles.navLinks}>
                        <Link href="/marketplace" className={styles.link}>
                            Marketplace
                        </Link>
                        <Link href="/farmer" className={styles.link}>
                            Farmer
                        </Link>
                        <Link href="/buyer" className={styles.link}>
                            Buyer
                        </Link>
                    </div>
                </div>

                <div className={styles.walletWrapper}>
                    {account && (
                        <>
                            <div className={styles.balance}>
                                {balance} TATO
                                <button
                                    className={styles.refreshButton}
                                    onClick={() => refetchBalance()}
                                    title="Refresh Balance"
                                    type="button"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth={2}
                                        stroke="currentColor"
                                        width="16"
                                        height="16"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
                                        />
                                    </svg>
                                </button>
                            </div>
                            <button
                                onClick={handleClaimFaucet}
                                className={styles.faucetButton}
                                type="button"
                            >
                                Claim TATO Faucet
                            </button>
                        </>
                    )}
                    <ConnectButton />
                </div>
            </div>
        </nav>
    );
}
