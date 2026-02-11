import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONSTANTS } from "@/lib/constants";
import { useState } from "react";

export function useDisputeActions() {
    const client = useSuiClient();
    const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
    const [isCreating, setIsCreating] = useState(false);
    const [isResolving, setIsResolving] = useState(false);
    const [isVoting, setIsVoting] = useState(false);

    /**
     * Buyer initiates a dispute for an order
     */
    const createDispute = async (orderId: string) => {
        setIsCreating(true);
        try {
            const tx = new Transaction();
            console.log("🚫 Creating dispute for order:", orderId);

            tx.moveCall({
                target: `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::create_dispute`,
                arguments: [
                    tx.object(orderId),
                ],
            });

            const { digest } = await signAndExecuteTransaction({ transaction: tx });
            await client.waitForTransaction({ digest });
            
            console.log("✅ Dispute created:", digest);
            return { success: true, digest };
        } catch (error) {
            console.error("Dispute creation error:", error);
            throw error;
        } finally {
            setIsCreating(false);
        }
    };

    /**
     * Propose new split percentages (Farmer % vs Buyer %)
     */
    const proposeCompensation = async (disputeId: string, farmerPercentage: number, buyerPercentage: number) => {
        setIsResolving(true);
        try {
            if (farmerPercentage + buyerPercentage !== 100) {
                throw new Error("Percentages must sum to 100");
            }

            const tx = new Transaction();
            console.log(`⚖️ Proposing compensation: Farmer ${farmerPercentage}% - Buyer ${buyerPercentage}%`);

            tx.moveCall({
                target: `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::propose_compensation`,
                arguments: [
                    tx.object(disputeId),
                    tx.pure.u64(farmerPercentage),
                    tx.pure.u64(buyerPercentage),
                ],
            });

            const { digest } = await signAndExecuteTransaction({ transaction: tx });
            await client.waitForTransaction({ digest });

            console.log("✅ Proposal submitted:", digest);
            return { success: true, digest };
        } catch (error) {
            console.error("Proposal error:", error);
            throw error;
        } finally {
            setIsResolving(false);
        }
    };

    /**
     * Accept current proposal and distribute funds (Resolves Dispute & Order)
     */
    const acceptCompensation = async (disputeId: string, orderId: string) => {
        setIsResolving(true);
        try {
            const tx = new Transaction();
            console.log("🤝 Accepting compensation for dispute:", disputeId);

            // Fetch dispute object to check if it's shared or owned
            const disputeObj = await client.getObject({
                id: disputeId,
                options: { showOwner: true }
            });

            console.log("Dispute object details:", disputeObj);

            // Use the dispute object - Sui SDK will handle shared vs owned automatically
            tx.moveCall({
                target: `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::accept_compensation`,
                arguments: [
                    tx.object(disputeId), // Dispute object
                    tx.object(orderId),   // Order object is consumed here
                ],
            });

            const { digest } = await signAndExecuteTransaction({ transaction: tx });
            await client.waitForTransaction({ digest });

            console.log("✅ Compensation accepted & distributed:", digest);
            return { success: true, digest };
        } catch (error) {
            console.error("Accept compensation error:", error);
            throw error;
        } finally {
            setIsResolving(false);
        }
    };

    /**
     * Vote on dispute (Optimistic DAO voting)
     */
    const voteOnDispute = async (disputeId: string, voteFor: boolean) => {
        setIsVoting(true);
        try {
            const tx = new Transaction();
            console.log(`🗳️ Voting on dispute ${disputeId}: ${voteFor ? "FOR" : "AGAINST"}`);

            tx.moveCall({
                target: `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::vote_on_dispute`,
                arguments: [
                    tx.object(disputeId),
                    tx.pure.bool(voteFor),
                ],
            });

            const { digest } = await signAndExecuteTransaction({ transaction: tx });
            await client.waitForTransaction({ digest });

            console.log("✅ Vote cast:", digest);
            return { success: true, digest };
        } catch (error) {
            console.error("Voting error:", error);
            throw error;
        } finally {
            setIsVoting(false);
        }
    };

    return {
        createDispute,
        proposeCompensation,
        acceptCompensation,
        voteOnDispute,
        isCreating,
        isResolving,
        isVoting
    };
}
