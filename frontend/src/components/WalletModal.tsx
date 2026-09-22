import React, { useEffect } from 'react'
import { useWallet } from '../context/WalletContext'
import { X, Wallet as WalletIcon, ExternalLink } from 'lucide-react'

export const WalletModal: React.FC = () => {
  const { walletState, discoveredWallets, closeChooser, connectWallet, errorMessage } = useWallet()

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeChooser()
    }
    if (walletState === 'CHOOSER_OPEN') {
      window.addEventListener('keydown', handleKeyDown)
    }
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [walletState, closeChooser])

  if (walletState !== 'CHOOSER_OPEN') return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={closeChooser}
    >
      <div
        className="w-full max-w-md bg-white border border-[#e7e5e0] rounded-xl shadow-lg p-6 space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 id="wallet-modal-title" className="text-base font-semibold text-[#18181b]">
              Connect Wallet
            </h3>
            <p className="text-xs text-[#71717a] mt-0.5">
              Select an installed Web3 wallet to interact with ClauseLab.
            </p>
          </div>
          <button
            onClick={closeChooser}
            className="text-[#a1a1aa] hover:text-[#18181b] p-1.5 rounded-lg hover:bg-[#f4f4f5] transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Error message if any */}
        {errorMessage && (
          <div role="alert" className="p-3 text-xs bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {errorMessage}
          </div>
        )}

        {/* Discovered Supported Wallets List */}
        <div className="space-y-2">
          {discoveredWallets.length > 0 ? (
            discoveredWallets.map((wallet) => (
              <button
                key={wallet.info.uuid || wallet.info.rdns}
                onClick={() => {
                  connectWallet(wallet)
                }}
                className="w-full flex items-center justify-between p-3.5 border border-[#e7e5e0] rounded-lg hover:border-[#a1a1aa] hover:bg-[#faf9f5] transition-all group text-left cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  {wallet.info.icon ? (
                    <img
                      src={wallet.info.icon}
                      alt={wallet.info.name}
                      className="w-7 h-7 rounded-md object-contain shrink-0"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-md bg-[#f4f4f5] flex items-center justify-center text-[#71717a]">
                      <WalletIcon className="w-4 h-4" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-[#18181b] group-hover:text-black">
                    {wallet.info.name}
                  </span>
                </div>
                <span className="text-xs text-[#71717a] group-hover:text-[#18181b] font-medium">
                  Connect &rarr;
                </span>
              </button>
            ))
          ) : (
            /* Clean empty state when no supported wallet is detected */
            <div className="py-8 text-center border border-dashed border-[#e7e5e0] rounded-xl bg-[#faf9f5]/50 px-4">
              <div className="w-10 h-10 rounded-full bg-white border border-[#e7e5e0] flex items-center justify-center mx-auto mb-3 text-[#71717a]">
                <WalletIcon className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-semibold text-[#18181b]">No Supported Wallet Found</h4>
              <p className="text-xs text-[#71717a] max-w-xs mx-auto mt-1 leading-relaxed">
                ClauseLab supports MetaMask, Rabby, and OKX Wallet. Please install a browser extension to proceed.
              </p>
              <div className="mt-4 flex items-center justify-center gap-3 text-xs font-medium">
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#18181b] hover:underline flex items-center gap-1"
                >
                  MetaMask <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-[#d4d4d8]">&bull;</span>
                <a
                  href="https://rabby.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#18181b] hover:underline flex items-center gap-1"
                >
                  Rabby <ExternalLink className="w-3 h-3" />
                </a>
                <span className="text-[#d4d4d8]">&bull;</span>
                <a
                  href="https://www.okx.com/web3"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#18181b] hover:underline flex items-center gap-1"
                >
                  OKX <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer note */}
        <div className="pt-2 border-t border-[#f4f4f5] text-[11px] text-[#a1a1aa] flex items-center justify-between">
          <span>Target: GenLayer Studionet (61999)</span>
          <span>Zero gas fees on Studionet</span>
        </div>
      </div>
    </div>
  )
}
