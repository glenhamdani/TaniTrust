import { useSuiClientQuery } from "@mysten/dapp-kit";
import { useQuery } from "@tanstack/react-query";

export interface Product {
    id: string;
    db_id: string;
    name: string;
    description: string;
    imageUrl: string;
    category: string;
    price: bigint;
    stock: bigint;
    farmer: string;
}

interface ProductMetadata {
    id: string; // Database ID
    sui_object_id: string;
    name: string;
    description: string;
    price_per_unit: string;
    stock: string;
    image_url: string;
    category: string;
    farmer_address: string;
}

export function useProducts() {
    // 1. Fetch metadata from Database API (for images, descriptions)
    const { data: apiData, isLoading: isApiLoading, refetch: refetchApi } = useQuery({
        queryKey: ["products-metadata"],
        queryFn: async () => {
            const res = await fetch("/api/products?limit=100");
            if (!res.ok) throw new Error("Failed to fetch products from API");
            return res.json();
        }
    });

    const productsMetadata = (apiData?.products || []) as ProductMetadata[];

    // 2. Extract Sui Object IDs from API data (to fetch live data from blockchain)
    const suiObjectIds = productsMetadata.map(p => p.sui_object_id);

    // 3. Fetch live data from Blockchain (for real-time stock & price)
    const { data: objectsData, isPending: isObjectsLoading, refetch: refetchSui } = useSuiClientQuery(
        "multiGetObjects",
        {
            ids: suiObjectIds,
            options: {
                showContent: true,
                showOwner: true,
            },
        },
        {
            enabled: suiObjectIds.length > 0,
        }
    );

    // 4. Merge Data: Base is API data, override with Blockchain data if available
    const products = productsMetadata.map((meta) => {
        // Find corresponding blockchain object
        const blockchainObj = objectsData?.find(
            (obj) => obj.data?.objectId === meta.sui_object_id
        );

        let blockchainData = null;
        if (blockchainObj?.data?.content?.dataType === "moveObject") {
            const content = blockchainObj.data.content as unknown as { fields: { price_per_unit: string; stock: string } };
            const fields = content.fields;
            if (fields) {
                blockchainData = {
                    price: fields.price_per_unit,
                    stock: fields.stock,
                    // name & farmer also available on chain
                };
            }
        }

        // Jika data di blockchain tidak ditemukan (mungkin dihapus/archiv), kita bisa skip atau tandai.
        // Untuk sekarang, kita tetap tampilkan dari database tapi dengan stok 0 jika tidak ada di chain.
        // TAPI: Jika blockchainData ada, kita pakai stok & harga dari sana (Source of Truth).
        
        return {
            id: meta.sui_object_id,          // Gunakan Sui Object ID sebagai ID utama di frontend
            db_id: meta.id,                  // Simpan DB ID jika perlu
            name: meta.name,                 // Nama dari DB (bisa diedit offline)
            description: meta.description,   // Deskripsi dari DB
            imageUrl: meta.image_url,        // Gambar dari DB
            category: meta.category,         // Kategori dari DB
            price: BigInt(blockchainData ? blockchainData.price : meta.price_per_unit), // Prioritas Chain
            stock: BigInt(blockchainData ? blockchainData.stock : meta.stock),          // Prioritas Chain
            farmer: meta.farmer_address,
        };
    }).filter(p => p.stock > BigInt(0)); // Hanya tampilkan yang stok > 0 di Blockchain (atau DB jika chain gagal)

    const refetch = () => {
        refetchApi();
        refetchSui();
    };

    return {
        products: products,
        isLoading: isApiLoading || (suiObjectIds.length > 0 && isObjectsLoading),
        error: null, // Simplifikasi error handling
        refetch,
    };
}
