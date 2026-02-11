import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { sui_object_id, order_id, buyer, farmer } = body;

        console.log("⚖️ Syncing Dispute to DB:", sui_object_id);

        const dispute = await prisma.dispute.create({
            data: {
                sui_object_id,
                order: { connect: { sui_object_id: order_id } },
                buyer,
                farmer,
                status: 0, // Pending
                // Defaults: percentages 0, votes 0
            }
        });

        return NextResponse.json({ success: true, dispute });
    } catch (error) {
        console.error("❌ Create Dispute Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
