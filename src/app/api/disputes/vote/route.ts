import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { dispute_id, voter_address, vote } = body; // vote: 'for' or 'against'

        console.log("🗳️ Vote received:", { dispute_id, voter_address, vote });

        // Get current dispute
        const currentDispute = await prisma.dispute.findUnique({
            where: { sui_object_id: dispute_id }
        });

        if (!currentDispute) {
            return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
        }

        // Check if voting is enabled
        if (!currentDispute.voting_enabled) {
            return NextResponse.json({ 
                error: 'Voting not yet enabled. Need 3+ proposals first.' 
            }, { status: 400 });
        }

        // Prevent farmer and buyer from voting
        if (voter_address === currentDispute.farmer || voter_address === currentDispute.buyer) {
            return NextResponse.json({ 
                error: 'Dispute parties cannot vote' 
            }, { status: 403 });
        }

        // TODO: Check if user already voted (need to create Vote model)
        // For now, we'll just increment the count

        const updatedDispute = await prisma.dispute.update({
            where: { sui_object_id: dispute_id },
            data: {
                votes_for: vote === 'for' ? currentDispute.votes_for + 1 : currentDispute.votes_for,
                votes_against: vote === 'against' ? currentDispute.votes_against + 1 : currentDispute.votes_against
            }
        });

        console.log(`✅ Vote counted. For: ${updatedDispute.votes_for}, Against: ${updatedDispute.votes_against}`);

        return NextResponse.json({ 
            success: true, 
            dispute: updatedDispute,
            total_votes: updatedDispute.votes_for + updatedDispute.votes_against
        });
    } catch (error) {
        console.error("Vote Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}

// GET endpoint to fetch voting status
export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const dispute_id = searchParams.get('dispute_id');

        if (!dispute_id) {
            return NextResponse.json({ error: 'dispute_id required' }, { status: 400 });
        }

        const dispute = await prisma.dispute.findUnique({
            where: { sui_object_id: dispute_id }
        });

        if (!dispute) {
            return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });
        }

        return NextResponse.json({
            voting_enabled: dispute.voting_enabled,
            votes_for: dispute.votes_for,
            votes_against: dispute.votes_against,
            total_votes: dispute.votes_for + dispute.votes_against,
            proposal_count: dispute.proposal_count
        });
    } catch (error) {
        console.error("Get Vote Status Error:", error);
        return NextResponse.json({ error: String(error) }, { status: 500 });
    }
}
