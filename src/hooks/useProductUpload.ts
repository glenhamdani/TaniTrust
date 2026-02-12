"use client";

import { useState } from "react";
import { useSignAndExecuteTransaction, useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { CONSTANTS } from "@/lib/constants";
import type { IPFSUploadResponse, ProductSyncRequest } from "@/types/product";

interface ProductFormData {
  name: string;
  price_per_unit: number;
  stock: number;
  fulfillment_time: number;
  description: string;
  category: string;
  image: File | null;
}

export function useProductUpload() {
  const account = useCurrentAccount();
  const client = useSuiClient();
  const { mutateAsync: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");

  const uploadProduct = async (formData: ProductFormData) => {
    if (!account) {
      throw new Error("Wallet not connected");
    }

    if (!formData.image) {
      throw new Error("Image is required");
    }

    try {
      setIsUploading(true);

      // Step 1: Upload image to IPFS
      setUploadProgress("Uploading image to IPFS...");
      const imageFormData = new FormData();
      imageFormData.append("file", formData.image);

      const ipfsResponse = await fetch("/api/products/upload-ipfs", {
        method: "POST",
        body: imageFormData,
      });

      if (!ipfsResponse.ok) {
        const errorData = await ipfsResponse.json().catch(() => ({}));
        throw new Error(errorData.error || `Upload failed with status: ${ipfsResponse.status}`);
      }

      const ipfsData: IPFSUploadResponse = await ipfsResponse.json();

      // Step 2: Create product on blockchain
      setUploadProgress("Creating product on blockchain...");

      const tx = new Transaction();
      const target = `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::upload_product`;
      console.log("🛠️ Calling Smart Contract:", target);

      tx.moveCall({
        target: target,
        arguments: [
          tx.pure.string(formData.name),
          tx.pure.u64(formData.price_per_unit), // Already converted to MIST in form
          tx.pure.u64(formData.stock),
          tx.pure.u64(formData.fulfillment_time), // Now stored in product
        ],
      });

      // Execute transaction
      const { digest } = await signAndExecuteTransaction({
        transaction: tx,
      });

      console.log("📝 Transaction Digest:", digest);
      setUploadProgress("Waiting for transaction confirmation...");

      // Wait for transaction result
      const result = await client.waitForTransaction({
        digest,
        options: {
          showEffects: true,
          showObjectChanges: true,
        },
      });

      console.log("✅ Transaction Confirmed:", result);

      // Extract object ID safely
      let productObjectId: string | undefined;

      if (result.effects?.created) {
        productObjectId = result.effects.created[0]?.reference?.objectId;
      }

      // Fallback: Check objectChanges
      if (!productObjectId && result.objectChanges) {
        // Use 'any' for change to avoid complex type mismatches with SDK unions
        const createdChange = result.objectChanges.find(
          (change: any) =>
            change.type === "created" &&
            change.objectType?.includes("::Product")
        );

        if (createdChange && "objectId" in createdChange) {
          productObjectId = createdChange.objectId;
        }
      }

      if (!productObjectId) {
        console.error("Failed to find created object ID. Result:", result);
        throw new Error("Failed to get product object ID from transaction");
      }

      // Step 3: Sync to database
      setUploadProgress("Syncing to database...");
      const syncData: ProductSyncRequest = {
        sui_object_id: productObjectId,
        name: formData.name,
        price_per_unit: formData.price_per_unit,
        stock: formData.stock,
        farmer_address: account.address,
        fulfillment_time: formData.fulfillment_time,
        image_url: ipfsData.url,
        image_cid: ipfsData.cid,
        description: formData.description,
        category: formData.category,
      };

      const syncResponse = await fetch("/api/products/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(syncData),
      });

      if (!syncResponse.ok) {
        const errorData = await syncResponse.json().catch(() => ({}));
        throw new Error(errorData.details || errorData.error || "Failed to sync product to database");
      }

      const syncResult = await syncResponse.json();

      setUploadProgress("Product created successfully!");
      return {
        success: true,
        productId: productObjectId,
        product: syncResult.product,
      };
    } catch (error) {
      console.error("Product upload error:", error);
      throw error;
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(""), 2000);
    }
  };

  return {
    uploadProduct,
    isUploading,
    uploadProgress,
  };
}
