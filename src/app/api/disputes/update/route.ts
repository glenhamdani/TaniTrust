import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { dispute_id, farmer_percentage, buyer_percentage, proposer_address } = body;

        console.log("📝 Updating Dispute Split:", dispute_id, "by", proposer_address);

        // Get current dispute to check proposal count
        const currentDispute = await prisma.dispute.findUnique({
            where: { sui_object_id: dispute_id }
        });

        if (!currentDispute) {
            return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
        }

        // Increment proposal count
        const newProposalCount = currentDispute.proposal_count + 1;
        
        // Enable voting if proposal count >= 3
        const votingEnabled = newProposalCount >= 3;

        const dispute = await prisma.dispute.update({
            where: { sui_object_id: dispute_id },
            data: {
                farmer_percentage: Number(farmer_percentage),
                buyer_percentage: Number(buyer_percentage),
                last_proposer: proposer_address,
                proposal_count: newProposalCount,
                voting_enabled: votingEnabled
            }
        });

        console.log(`✅ Proposal #${newProposalCount}. Voting ${votingEnabled ? 'ENABLED' : 'disabled'}`);

        return NextResponse.json({ 
            success: true, 
            dispute,
            voting_activated: votingEnabled && newProposalCount === 3 // First time activation
        });
    } catch (error) {
        console.error("Update Dispute Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
