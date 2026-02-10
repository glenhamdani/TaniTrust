import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { CONSTANTS } from "@/lib/constants";

export function useOrders() {
    const account = useCurrentAccount();

    // 1. Get owned objects of type "Order"
    const { data: ownedObjects, isPending: isOwnedLoading, error: ownedError, refetch } = useSuiClientQuery(
        "getOwnedObjects",
        {
            owner: account?.address || "",
            filter: {
                StructType: `${CONSTANTS.PACKAGE_ID}::${CONSTANTS.MARKETPLACE_MODULE}::Order`,
            },
            options: {
                showContent: true,
            },
        },
        {
            enabled: !!account,
        }
    );

    // 2. Parse data
    const orders = ownedObjects?.data?.map((obj) => {
        const content = obj.data?.content as any;
        if (!content || content.dataType !== "moveObject") return null;

        const fields = content.fields;
        return {
            id: obj.data?.objectId,
            product_id: fields.product_id,
            buyer: fields.buyer,
            farmer: fields.farmer,
            quantity: BigInt(fields.quantity),
            total_price: BigInt(fields.total_price),
            deadline: BigInt(fields.deadline),
            status: Number(fields.status),
            // We don't display balance detail here usually, just total_price
        };
    }).filter((o) => o !== null && o.id !== "") as { id: string; product_id: any; buyer: any; farmer: any; quantity: bigint; total_price: bigint; deadline: bigint; status: number }[];

    return {
        orders,
        isLoading: isOwnedLoading,
        error: ownedError,
        refetch,
    };
}
