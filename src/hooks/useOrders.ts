import { useQuery } from "@tanstack/react-query";
import { useCurrentAccount } from "@mysten/dapp-kit";

export interface Order {
    id: string; // sui_object_id
    product_id: string;
    buyer: string;
    farmer: string;
    quantity: string;
    total_price: string;
    deadline: string;
    status: number; // 1: Escrowed, 2: Completed, etc.
    product?: {
        name: string;
        image_url: string;
    };
    dispute?: {
        sui_object_id: string;
        status: number;
        farmer_percentage: number;
        buyer_percentage: number;
        last_proposer?: string | null;
        proposal_count?: number;
        voting_enabled?: boolean;
        votes_for?: number;
        votes_against?: number;
    };
    createdAt: string;
}

export function useOrders(params?: { buyer?: string; farmer?: string }) {
    const account = useCurrentAccount();
    
    // Determine query parameter
    const queryParam = params?.buyer 
        ? `buyer=${params.buyer}` 
        : params?.farmer 
        ? `farmer=${params.farmer}` 
        : account?.address 
        ? `buyer=${account.address}` 
        : '';
    
    const { data: orders, isLoading, error, refetch } = useQuery({
        queryKey: ["orders", queryParam],
        queryFn: async () => {
            if (!queryParam) return [];
            
            const res = await fetch(`/api/orders?${queryParam}`);
            if (!res.ok) {
                throw new Error("Failed to fetch orders");
            }
            const data = await res.json();
            
            // Map DB structure to frontend structure expected by UI (if needed)
            // Currently UI expects: id, status, deadline, total_price, quantity
            return (data.orders || []).map((o: any) => ({
                id: o.sui_object_id,
                ...o
            })) as Order[];
        },
        enabled: !!queryParam,
        refetchInterval: 5000, // Auto-refetch every 5 seconds
        refetchIntervalInBackground: false, // Only refetch when tab is active
    });

    return {
        orders: orders || [],
        isLoading: isLoading && !!queryParam,
        error,
        refetch
    };
}
