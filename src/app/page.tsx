import Link from "next/link";
import styles from "./page.module.css";

export default function Home() {
  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          Welcome to <span className={styles.highlight}>TaniTrust</span> 🌾
        </h1>
        <p className={styles.subtitle}>
          Decentralized Agricultural Marketplace on SUI Network.
          Connect buyers directly with farmers. No middlemen. Transparent. Fast.
        </p>
      </header>

      <div className={styles.grid}>
        <Link href="/marketplace" className={styles.card}>
          <h2 className={styles.cardTitle}>Marketplace &rarr;</h2>
          <p className={styles.cardDesc}>Browse fresh produce directly from farmers.</p>
        </Link>

        <Link href="/farmer" className={styles.card}>
          <h2 className={styles.cardTitle}>For Farmers &rarr;</h2>
          <p className={styles.cardDesc}>Upload your products and manage your inventory.</p>
        </Link>

        <Link href="/buyer" className={styles.card}>
          <h2 className={styles.cardTitle}>Your Orders &rarr;</h2>
          <p className={styles.cardDesc}>Track your purchases and confirm deliveries.</p>
        </Link>
      </div>
    </main>
  );
}
