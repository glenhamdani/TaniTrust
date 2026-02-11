"use client";

import { useCurrentAccount } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";

interface WalletGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadingComponent?: React.ReactNode;
}

export function WalletGuard({ 
  children, 
  fallback,
  loadingComponent 
}: WalletGuardProps) {
  const account = useCurrentAccount();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // Give time for auto-reconnect to complete
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 1000); // 1 second should be enough for auto-reconnect

    return () => clearTimeout(timer);
  }, []);

  // Show loading during initialization
  if (isInitializing) {
    return (
      <>
        {loadingComponent || (
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            minHeight: '60vh',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f4f6',
              borderTop: '4px solid #166534',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: '#6b7280' }}>Loading...</p>
            <style jsx>{`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}
      </>
    );
  }

  // After initialization, check if wallet is connected
  if (!account) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
