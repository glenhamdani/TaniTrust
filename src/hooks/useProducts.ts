import { useSuiClientQuery } from "@mysten/dapp-kit";
import { CONSTANTS } from "@/lib/constants";

const DUMMY_PRODUCTS = [
    { id: "dummy1", name: "Premium Rice 5kg", price: BigInt(500000000), stock: BigInt(20), farmer: "0x123...abc" },
    { id: "dummy2", name: "Organic Corn 1kg", price: BigInt(150000000), stock: BigInt(50), farmer: "0x456...def" },
    { id: "dummy3", name: "Fresh Chillies 250g", price: BigInt(50000000), stock: BigInt(10), farmer: "0x789...ghi" },
];

export function useProducts() {
    // 1. Fetch "ProductListedEvent" events to find all product IDs
    const { data: eventsData, isPending: isEventsLoading, error: eventsError } = useSuiClientQuery(
        "queryEvents",
        {
            query: {
                MoveEventModule: {
                    package: CONSTANTS.PACKAGE_ID,
                    module: CONSTANTS.MARKETPLACE_MODULE,
                },
            },
            order: "descending",
        }
    );

    // 2. Extract unique product IDs
    const productIds = eventsData?.data?.map((event) => {
        const parsedJson = event.parsedJson as any;
        return parsedJson?.product_id;
    }) || [];

    // Remove duplicates just in case
    const uniqueProductIds = Array.from(new Set(productIds));

    // 3. Fetch the actual objects to get current stock/price
    const { data: objectsData, isPending: isObjectsLoading, error: objectsError } = useSuiClientQuery(
        "multiGetObjects",
        {
            ids: uniqueProductIds,
            options: {
                showContent: true,
                showOwner: true,
            },
        },
        {
            enabled: uniqueProductIds.length > 0,
        }
    );

    // 4. Parse the object data into a usable format
    const products = objectsData?.map((obj) => {
        const content = obj.data?.content as any;
        if (!content || content.dataType !== "moveObject") return null;

        const fields = content.fields;
        return {
            id: obj.data?.objectId,
            name: fields.name,
            price: BigInt(fields.price_per_unit), // Price is u64
            stock: BigInt(fields.stock), // Stock is u64
            farmer: fields.farmer,
        };
    }).filter((p) => p !== null && p.stock > BigInt(0)) as { id: string; name: string; price: bigint; stock: bigint; farmer: string }[];

    // Fallback to dummy data if no products found (for demo purposes)
    const finalProducts = (products && products.length > 0) ? products : DUMMY_PRODUCTS;

    return {
        products: finalProducts,
        isLoading: isEventsLoading || (uniqueProductIds.length > 0 && isObjectsLoading),
        error: eventsError || objectsError,
    };
}
