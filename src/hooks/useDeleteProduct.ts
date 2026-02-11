import { useSignAndExecuteTransaction, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONSTANTS } from "@/lib/constants";
import { useState } from "react";

export function useDeleteProduct() {
  const client = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteProduct = async (productId: string) => {
    setIsDeleting(true);
    try {
      const tx = new Transaction();

      const target = `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::delete_product`;
      console.log("🛠️ Calling Smart Contract:", target);
      console.log("📦 Target Product ID:", productId);

      // Call delete_product function
      tx.moveCall({
        target: target,
        arguments: [
          tx.object(productId), // product: Product (by value, will be consumed)
        ],
      });

      const { digest } = await signAndExecuteTransaction({
        transaction: tx,
      });

      console.log("Waiting for deletion confirmation...");
      await client.waitForTransaction({ digest });
      
      console.log("Blockchain deletion confirmed. Deleting from database...");
      const res = await fetch(`/api/products/${productId}`, {
          method: "DELETE",
      });

      if (!res.ok) {
          console.error("Database deletion failed but blockchain succeeded.");
          // We don't throw error here to not confuse UI (item is gone from chain)
      } else {
          console.log("Database deletion successful.");
      }

      return { digest };
    } catch (error) {
      console.error("Delete product error:", error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    deleteProduct,
    isDeleting,
  };
}
