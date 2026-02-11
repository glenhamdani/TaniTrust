import { useState } from "react";
import { useDisputeActions } from "@/hooks/useDisputeActions";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { VotingSection } from "./VotingSection";

interface DisputeData {
    sui_object_id: string;
    farmer_percentage: number;
    buyer_percentage: number;
    status: number;
    last_proposer?: string | null;
    proposal_count?: number;
    voting_enabled?: boolean;
    votes_for?: number;
    votes_against?: number;
}

interface OrderData {
    id: string;
    farmer: string;
    buyer: string;
    dispute?: DisputeData;
}

export function DisputeSection({ order, onUpdate }: { order: OrderData, onUpdate: () => void }) {
    const { proposeCompensation, acceptCompensation, isResolving } = useDisputeActions();
    const account = useCurrentAccount();
    const [farmerPct, setFarmerPct] = useState<number>(order.dispute?.farmer_percentage || 50);
    const [statusMsg, setStatusMsg] = useState("");
    const [showNegotiation, setShowNegotiation] = useState(false);

    const currentUserAddress = account?.address;
    const dispute = order.dispute;
    const isFarmer = currentUserAddress === order.farmer;

    // Turn-based logic
    const isLastProposer = dispute?.last_proposer === currentUserAddress;
    const canAccept = !isLastProposer && dispute?.proposal_count && dispute.proposal_count > 0;
    const proposalCount = dispute?.proposal_count || 0;
    const votingEnabled = dispute?.voting_enabled || false;

    const handlePropose = async () => {
        try {
            setStatusMsg("Proposing split...");
            const buyerPct = 100 - farmerPct;
            
            // 1. On-Chain
            await proposeCompensation(dispute!.sui_object_id, farmerPct, buyerPct);
            
            // 2. Sync DB with proposer address
            const response = await fetch('/api/disputes/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    dispute_id: dispute!.sui_object_id,
                    farmer_percentage: farmerPct,
                    buyer_percentage: buyerPct,
                    proposer_address: currentUserAddress
                })
            });

            const data = await response.json();

            if (data.voting_activated) {
                setStatusMsg("⚠️ Voting system activated! Community can now vote after 3 proposals.");
            } else {
                setStatusMsg("✅ Proposal sent successfully!");
            }
            
            setShowNegotiation(false);
            onUpdate();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Unknown error";
            console.error(e);
            setStatusMsg("❌ Error: " + msg);
        }
    };

    const handleAccept = async () => {
        try {
            setStatusMsg("Resolving dispute...");
            
            // 1. On-Chain Resolution
            await acceptCompensation(dispute!.sui_object_id, order.id);

            // 2. Sync DB
            await fetch('/api/disputes/resolve', {
                 method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({
                     dispute_id: dispute!.sui_object_id,
                     order_id: order.id
                 })
            });

            setStatusMsg("✅ Dispute Resolved!");
            onUpdate();
        } catch (e: unknown) {
             const msg = e instanceof Error ? e.message : "Unknown error";
             console.error(e);
             setStatusMsg("❌ Error: " + msg);
        }
    };

    if (!dispute) return null;

    const isResolved = dispute.status === 1;
    const currentFarmerPct = dispute.farmer_percentage;
    const currentBuyerPct = dispute.buyer_percentage;

    return (
        <div style={{
            border: '2px solid #f39c12',
            background: 'linear-gradient(135deg, #fff9e6 0%, #fffcf5 100%)',
            padding: '20px',
            marginTop: '15px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(243, 156, 18, 0.15)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
                <h4 style={{ margin: 0, color: '#d35400', fontSize: '1.1rem', fontWeight: '600' }}>
                    ⚖️ Dispute Resolution {isResolved && <span style={{ color: '#27ae60' }}>(Resolved)</span>}
                </h4>
                {isResolved && (
                    <span style={{ 
                        backgroundColor: '#27ae60', 
                        color: 'white', 
                        padding: '4px 12px', 
                        borderRadius: '20px', 
                        fontSize: '0.85rem',
                        fontWeight: '600'
                    }}>
                        ✓ Completed
                    </span>
                )}
            </div>

            {/* Proposal Count & Voting Status */}
            {!isResolved && proposalCount > 0 && (
                <div style={{
                    backgroundColor: votingEnabled ? '#fff3cd' : '#e8f4f8',
                    padding: '10px 15px',
                    borderRadius: '6px',
                    marginBottom: '15px',
                    border: `1px solid ${votingEnabled ? '#ffc107' : '#bee5eb'}`,
                    fontSize: '0.85rem',
                    fontWeight: '500',
                    color: votingEnabled ? '#856404' : '#0c5460'
                }}>
                    {votingEnabled ? (
                        <>🗳️ <strong>Voting Enabled</strong> - Community can now vote on this dispute (Proposal #{proposalCount})</>
                    ) : (
                        <>📊 Proposal #{proposalCount} - {3 - proposalCount} more proposal(s) until voting activation</>
                    )}
                </div>
            )}
            
            {/* Current Split Display */}
            <div style={{ 
                backgroundColor: 'white', 
                padding: '15px', 
                borderRadius: '8px', 
                marginBottom: '15px',
                border: '1px solid #f0e5d8'
            }}>
                <div style={{ fontSize: '0.85rem', color: '#7f8c8d', marginBottom: '8px', fontWeight: '500' }}>
                    Current Compensation Split:
                </div>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '4px' }}>Farmer</div>
                        <div style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: 'bold', 
                            color: '#27ae60',
                            display: 'flex',
                            alignItems: 'baseline'
                        }}>
                            {currentFarmerPct}
                            <span style={{ fontSize: '1rem', marginLeft: '2px' }}>%</span>
                        </div>
                    </div>
                    <div style={{ fontSize: '1.2rem', color: '#bdc3c7' }}>|</div>
                    <div style={{ flex: 1 }}>
                        <div style={{ fontSize: '0.9rem', color: '#555', marginBottom: '4px' }}>Buyer</div>
                        <div style={{ 
                            fontSize: '1.5rem', 
                            fontWeight: 'bold', 
                            color: '#3498db',
                            display: 'flex',
                            alignItems: 'baseline'
                        }}>
                            {currentBuyerPct}
                            <span style={{ fontSize: '1rem', marginLeft: '2px' }}>%</span>
                        </div>
                    </div>
                </div>
            </div>

            {!isResolved && (
                <>
                    {/* Waiting for Response Message */}
                    {isLastProposer && (
                        <div style={{
                            backgroundColor: '#e8f4f8',
                            padding: '15px',
                            borderRadius: '8px',
                            marginBottom: '15px',
                            border: '1px solid #bee5eb',
                            textAlign: 'center',
                            color: '#0c5460',
                            fontWeight: '500'
                        }}>
                            ⏳ Waiting for the other party to respond to your proposal...
                        </div>
                    )}

                    {!showNegotiation ? (
                        <>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button 
                                    onClick={() => setShowNegotiation(true)}
                                    style={{ 
                                        flex: 1, 
                                        padding: '12px', 
                                        backgroundColor: '#f39c12', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '8px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e67e22'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f39c12'}
                                >
                                    {isLastProposer ? "📝 Counter-Propose" : "📝 Propose New Split"}
                                </button>
                                {canAccept && !isFarmer && (
                                    <button 
                                        onClick={handleAccept}
                                        disabled={isResolving}
                                        style={{ 
                                            flex: 1, 
                                            padding: '12px', 
                                            backgroundColor: '#27ae60', 
                                            color: 'white', 
                                            border: 'none', 
                                            borderRadius: '8px',
                                            cursor: isResolving ? 'wait' : 'pointer',
                                            fontWeight: '600',
                                            fontSize: '0.95rem',
                                            opacity: isResolving ? 0.7 : 1,
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => !isResolving && (e.currentTarget.style.backgroundColor = '#229954')}
                                        onMouseOut={(e) => !isResolving && (e.currentTarget.style.backgroundColor = '#27ae60')}
                                    >
                                        {isResolving ? "Processing..." : "✓ Accept & Resolve"}
                                    </button>
                                )}
                            </div>
                            
                            {/* Warning/Instruction for Farmer */}
                            {canAccept && isFarmer && (
                                 <div style={{
                                    marginTop: '12px',
                                    padding: '12px',
                                    backgroundColor: '#fff3cd',
                                    color: '#856404',
                                    borderRadius: '8px',
                                    fontSize: '0.9rem',
                                    textAlign: 'left',
                                    border: '1px solid #ffeeba',
                                    display: 'flex',
                                    alignItems: 'start',
                                    gap: '10px'
                                }}>
                                    <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                                    <div>
                                        <strong>Waiting for Buyer to Accept</strong><br/>
                                        Because the Buyer initiated the dispute, they own the dispute object. Only the Buyer can click "Accept & Resolve". Please wait for them to confirm.
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <div style={{ 
                            backgroundColor: 'white', 
                            padding: '20px', 
                            borderRadius: '8px',
                            border: '1px solid #f0e5d8',
                            minHeight: '200px'
                        }}>
                            <div style={{ marginBottom: '20px' }}>
                                <label style={{ display: 'block', fontSize: '0.95rem', fontWeight: '600', color: '#555', marginBottom: '15px' }}>
                                    {isLastProposer ? "Counter-Propose Split:" : "Propose New Split:"}
                                </label>
                                
                                {/* Slider */}
                                <input 
                                    type="range" 
                                    min="0" 
                                    max="100" 
                                    value={farmerPct} 
                                    onChange={(e) => setFarmerPct(parseInt(e.target.value))}
                                    style={{ 
                                        width: '100%',
                                        height: '8px',
                                        borderRadius: '4px',
                                        outline: 'none',
                                        background: `linear-gradient(to right, #27ae60 0%, #27ae60 ${farmerPct}%, #3498db ${farmerPct}%, #3498db 100%)`,
                                        cursor: 'pointer'
                                    }}
                                />
                                
                                {/* Number Inputs */}
                                <div style={{ 
                                    display: 'flex', 
                                    justifyContent: 'space-between', 
                                    alignItems: 'center',
                                    marginTop: '15px',
                                    gap: '15px'
                                }}>
                                    {/* Farmer Input */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '0.85rem', color: '#27ae60', fontWeight: '600' }}>
                                            Farmer Share
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input 
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={farmerPct}
                                                onChange={(e) => {
                                                    const val = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                    setFarmerPct(val);
                                                }}
                                                style={{
                                                    width: '80px',
                                                    padding: '8px 12px',
                                                    fontSize: '1.1rem',
                                                    fontWeight: '600',
                                                    color: '#27ae60',
                                                    border: '2px solid #27ae60',
                                                    borderRadius: '6px',
                                                    textAlign: 'center',
                                                    outline: 'none'
                                                }}
                                            />
                                            <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#27ae60' }}>%</span>
                                        </div>
                                    </div>

                                    <div style={{ fontSize: '1.5rem', color: '#bdc3c7', fontWeight: '300' }}>|</div>

                                    {/* Buyer Input */}
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <label style={{ fontSize: '0.85rem', color: '#3498db', fontWeight: '600' }}>
                                            Buyer Share
                                        </label>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <input 
                                                type="number"
                                                min="0"
                                                max="100"
                                                value={100 - farmerPct}
                                                onChange={(e) => {
                                                    const buyerVal = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                                    setFarmerPct(100 - buyerVal);
                                                }}
                                                style={{
                                                    width: '80px',
                                                    padding: '8px 12px',
                                                    fontSize: '1.1rem',
                                                    fontWeight: '600',
                                                    color: '#3498db',
                                                    border: '2px solid #3498db',
                                                    borderRadius: '6px',
                                                    textAlign: 'center',
                                                    outline: 'none'
                                                }}
                                            />
                                            <span style={{ fontSize: '1.1rem', fontWeight: '600', color: '#3498db' }}>%</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: '10px' }}>
                                <button 
                                    onClick={() => setShowNegotiation(false)}
                                    style={{ 
                                        flex: 1, 
                                        padding: '12px', 
                                        backgroundColor: '#95a5a6', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#7f8c8d'}
                                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#95a5a6'}
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handlePropose}
                                    disabled={isResolving}
                                    style={{ 
                                        flex: 1, 
                                        padding: '12px', 
                                        backgroundColor: '#f39c12', 
                                        color: 'white', 
                                        border: 'none', 
                                        borderRadius: '6px',
                                        cursor: isResolving ? 'wait' : 'pointer',
                                        fontWeight: '600',
                                        fontSize: '0.95rem',
                                        opacity: isResolving ? 0.7 : 1,
                                        transition: 'background-color 0.2s'
                                    }}
                                    onMouseOver={(e) => !isResolving && (e.currentTarget.style.backgroundColor = '#e67e22')}
                                    onMouseOut={(e) => !isResolving && (e.currentTarget.style.backgroundColor = '#f39c12')}
                                >
                                    {isResolving ? "Sending..." : "Send Proposal"}
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Voting Section - Show if voting is enabled */}
            {votingEnabled && !isResolved && (
                <VotingSection
                    disputeId={dispute.sui_object_id}
                    farmerAddress={order.farmer}
                    buyerAddress={order.buyer}
                    initialVotesFor={dispute.votes_for || 0}
                    initialVotesAgainst={dispute.votes_against || 0}
                    onVoteSuccess={onUpdate}
                />
            )}

            {statusMsg && (
                <div style={{ 
                    marginTop: '12px', 
                    padding: '10px', 
                    backgroundColor: statusMsg.includes('✅') ? '#d4edda' : statusMsg.includes('❌') ? '#f8d7da' : statusMsg.includes('⚠️') ? '#fff3cd' : '#d1ecf1',
                    color: statusMsg.includes('✅') ? '#155724' : statusMsg.includes('❌') ? '#721c24' : statusMsg.includes('⚠️') ? '#856404' : '#0c5460',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: '500'
                }}>
                    {statusMsg}
                </div>
            )}
        </div>
    );
}
