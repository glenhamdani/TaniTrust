import { useState } from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";

interface VotingSectionProps {
    disputeId: string;
    farmerAddress: string;
    buyerAddress: string;
    initialVotesFor?: number;
    initialVotesAgainst?: number;
    onVoteSuccess?: () => void;
}

export function VotingSection({ 
    disputeId, 
    farmerAddress, 
    buyerAddress,
    initialVotesFor = 0,
    initialVotesAgainst = 0,
    onVoteSuccess 
}: VotingSectionProps) {
    const account = useCurrentAccount();
    const [votesFor, setVotesFor] = useState(initialVotesFor);
    const [votesAgainst, setVotesAgainst] = useState(initialVotesAgainst);
    const [hasVoted, setHasVoted] = useState(false);
    const [isVoting, setIsVoting] = useState(false);
    const [voteMsg, setVoteMsg] = useState("");

    const currentUserAddress = account?.address;
    const isDisputeParty = currentUserAddress === farmerAddress || currentUserAddress === buyerAddress;
    const totalVotes = votesFor + votesAgainst;
    const forPercentage = totalVotes > 0 ? Math.round((votesFor / totalVotes) * 100) : 0;
    const againstPercentage = totalVotes > 0 ? Math.round((votesAgainst / totalVotes) * 100) : 0;

    const handleVote = async (vote: 'for' | 'against') => {
        if (hasVoted || isDisputeParty || !currentUserAddress) return;

        try {
            setIsVoting(true);
            setVoteMsg(`Submitting ${vote === 'for' ? 'support' : 'opposition'} vote...`);

            const response = await fetch('/api/disputes/vote', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dispute_id: disputeId,
                    voter_address: currentUserAddress,
                    vote
                })
            });

            const data = await response.json();

            if (response.ok) {
                setVotesFor(data.dispute.votes_for);
                setVotesAgainst(data.dispute.votes_against);
                setHasVoted(true);
                setVoteMsg(`✅ Vote submitted! Total votes: ${data.total_votes}`);
                onVoteSuccess?.();
            } else {
                setVoteMsg(`❌ ${data.error}`);
            }
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            console.error(e);
            setVoteMsg("❌ Error: " + msg);
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <div style={{
            backgroundColor: '#fff9e6',
            border: '2px solid #ffc107',
            borderRadius: '10px',
            padding: '20px',
            marginTop: '15px'
        }}>
            <div style={{ marginBottom: '15px' }}>
                <h4 style={{ margin: '0 0 8px 0', color: '#856404', fontSize: '1rem', fontWeight: '600' }}>
                    🗳️ Community Voting
                </h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#856404' }}>
                    Help resolve this dispute by voting on the current proposal
                </p>
            </div>

            {/* Vote Results */}
            <div style={{
                backgroundColor: 'white',
                borderRadius: '8px',
                padding: '15px',
                marginBottom: '15px'
            }}>
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#27ae60' }}>
                            👍 Support ({votesFor})
                        </span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#27ae60' }}>
                            {forPercentage}%
                        </span>
                    </div>
                    <div style={{
                        height: '10px',
                        backgroundColor: '#e0e0e0',
                        borderRadius: '5px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${forPercentage}%`,
                            backgroundColor: '#27ae60',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>

                <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#e74c3c' }}>
                            👎 Oppose ({votesAgainst})
                        </span>
                        <span style={{ fontSize: '0.9rem', fontWeight: '600', color: '#e74c3c' }}>
                            {againstPercentage}%
                        </span>
                    </div>
                    <div style={{
                        height: '10px',
                        backgroundColor: '#e0e0e0',
                        borderRadius: '5px',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            height: '100%',
                            width: `${againstPercentage}%`,
                            backgroundColor: '#e74c3c',
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>

                <div style={{ 
                    marginTop: '12px', 
                    paddingTop: '12px', 
                    borderTop: '1px solid #e0e0e0',
                    fontSize: '0.85rem',
                    color: '#666',
                    textAlign: 'center'
                }}>
                    Total Votes: <strong>{totalVotes}</strong>
                </div>
            </div>

            {/* Voting Buttons */}
            {isDisputeParty ? (
                <div style={{
                    backgroundColor: '#fff3cd',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #ffc107',
                    textAlign: 'center',
                    fontSize: '0.9rem',
                    color: '#856404'
                }}>
                    ⚠️ Dispute parties cannot vote
                </div>
            ) : hasVoted ? (
                <div style={{
                    backgroundColor: '#d4edda',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #28a745',
                    textAlign: 'center',
                    fontSize: '0.9rem',
                    color: '#155724',
                    fontWeight: '500'
                }}>
                    ✅ You have already voted
                </div>
            ) : (
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => handleVote('for')}
                        disabled={isVoting}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: '#27ae60',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isVoting ? 'wait' : 'pointer',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            opacity: isVoting ? 0.7 : 1,
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => !isVoting && (e.currentTarget.style.backgroundColor = '#229954')}
                        onMouseOut={(e) => !isVoting && (e.currentTarget.style.backgroundColor = '#27ae60')}
                    >
                        👍 Support Proposal
                    </button>
                    <button
                        onClick={() => handleVote('against')}
                        disabled={isVoting}
                        style={{
                            flex: 1,
                            padding: '12px',
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: isVoting ? 'wait' : 'pointer',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            opacity: isVoting ? 0.7 : 1,
                            transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => !isVoting && (e.currentTarget.style.backgroundColor = '#c0392b')}
                        onMouseOut={(e) => !isVoting && (e.currentTarget.style.backgroundColor = '#e74c3c')}
                    >
                        👎 Oppose Proposal
                    </button>
                </div>
            )}

            {/* Vote Message */}
            {voteMsg && (
                <div style={{
                    marginTop: '12px',
                    padding: '10px',
                    backgroundColor: voteMsg.includes('✅') ? '#d4edda' : voteMsg.includes('❌') ? '#f8d7da' : '#d1ecf1',
                    color: voteMsg.includes('✅') ? '#155724' : voteMsg.includes('❌') ? '#721c24' : '#0c5460',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                }}>
                    {voteMsg}
                </div>
            )}
        </div>
    );
}
