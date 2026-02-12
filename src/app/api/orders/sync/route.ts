import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            sui_object_id,
            product_id,
            buyer,
            farmer,
            quantity,
            total_price,
            deadline,
            status // Add status to destructured body
        } = body;

        console.log("📥 Syncing Order to DB:", sui_object_id, "Status:", status);

        // Check if order exists
        const existingOrder = await prisma.order.findUnique({
            where: { sui_object_id }
        });

        let order;

        if (existingOrder) {
            // Update existig order
            order = await prisma.order.update({
                where: { sui_object_id },
                data: {
                    status: status !== undefined ? Number(status) : undefined,
                    // Update other fields if necessary, but status is the main one for updates
                }
            });
        } else {
            // Create New Order
            order = await prisma.order.create({
                data: {
                    sui_object_id,
                    product_id,
                    buyer,
                    farmer,
                    quantity: BigInt(quantity),
                    total_price: BigInt(total_price),
                    deadline: BigInt(deadline),
                    status: status !== undefined ? Number(status) : 1, // Default: Escrowed
                }
            });
        }

        // Convert BigInt to string for JSON response
        const serializedOrder = {
            ...order,
            quantity: order.quantity.toString(),
            total_price: order.total_price.toString(),
            deadline: order.deadline.toString()
        };

        return NextResponse.json({ success: true, order: serializedOrder });
    } catch (error) {
        console.error("❌ Sync Order Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
