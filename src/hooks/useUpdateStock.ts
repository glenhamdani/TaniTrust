import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONSTANTS } from "@/lib/constants";
import { useState } from "react";

export function useUpdateStock() {
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isUpdating, setIsUpdating] = useState(false);

  const updateStock = async (productId: string, newStock: number) => {
    setIsUpdating(true);
    try {
      const tx = new Transaction();

      tx.moveCall({
        target: `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::update_stock`,
        arguments: [
          tx.object(productId), // product: &mut Product
          tx.pure.u64(newStock), // new_stock: u64
        ],
      });

      const result = await signAndExecuteTransaction({
        transaction: tx,
      });

      return result;
    } catch (error) {
      console.error("Update stock error:", error);
      throw error;
    } finally {
      setIsUpdating(false);
    }
  };

  return {
    updateStock,
    isUpdating,
  };
}
