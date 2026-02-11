import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONSTANTS } from "@/lib/constants";
import { useState } from "react";

export function useRefundActions() {
    const client = useSuiClient();
    const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
    const [isProcessing, setIsProcessing] = useState(false);

    const processExpiredOrder = async (orderId: string) => {
        setIsProcessing(true);
        try {
            const tx = new Transaction();
            
            console.log("⏳ Processing Expired Order:", orderId);

            tx.moveCall({
                target: `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::process_expired_order`,
                arguments: [
                    tx.object(orderId),
                    tx.object(CONSTANTS.CLOCK_OBJECT),
                ],
            });

            const { digest } = await signAndExecuteTransaction({ transaction: tx });
            
            console.log("Waiting for refund confirmation...");
            await client.waitForTransaction({ digest });
            console.log("✅ Refund confirmed:", digest);

            // Optional: Here you would call your backend API to sync the 'Refunded' status
            // await fetch(`/api/orders/${orderId}/refund`, { method: "POST" });
            
            return { success: true, digest };
        } catch (error: any) {
            console.error("Refund error:", error);
            throw error;
        } finally {
            setIsProcessing(false);
        }
    };

    return { processExpiredOrder, isProcessing };
}
