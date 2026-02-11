import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { dispute_id, order_id } = body;

        console.log("✅ Resolving Dispute:", dispute_id);

        const dispute = await prisma.dispute.update({
            where: { sui_object_id: dispute_id },
            data: { status: 1 } // Resolved
        });

        // Set Order to Completed (2) as funds are distributed
        const order = await prisma.order.update({
            where: { sui_object_id: order_id },
            data: { status: 2 }
        });

        return NextResponse.json({ success: true, dispute, order });
    } catch (error) {
        console.error("Resolve Dispute Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
