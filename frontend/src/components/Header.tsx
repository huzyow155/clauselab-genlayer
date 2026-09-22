import React from 'react'
import { useWallet } from '../context/WalletContext'
import { CONTRACT_ADDRESS, STUDIONET_EXPLORER_URL } from '../config/chain'
import { ExternalLink, Wallet, AlertCircle, Copy, Check } from 'lucide-react'

interface HeaderProps {
  onOpenHowItWorks: () => void
}

export const Header: React.FC<HeaderProps> = ({ onOpenHowItWorks }) => {
  const { walletState, account, openChooser, disconnectWallet, switchToStudionet } = useWallet()
  const [copied, setCopied] = React.useState(false)

  const copyAddress = () => {
    navigator.clipboard.writeText(CONTRACT_ADDRESS)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shortAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <header className="border-b border-[#e7e5e0] bg-[#faf9f5]/90 backdrop-blur sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#18181b] flex items-center justify-center text-white font-bold text-sm tracking-tight shadow-xs">
              CL
            </div>
            <div>
              <span className="font-bold text-lg text-[#18181b] tracking-tight">ClauseLab</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-mono text-[#71717a] border border-[#e4e4e7] px-1.5 py-0.5 rounded">
                Studionet
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-4 text-sm font-medium text-[#52525b]">
            <button
              onClick={onOpenHowItWorks}
              className="hover:text-[#18181b] transition-colors cursor-pointer"
            >
              How it works
            </button>
            <a
              href={`${STUDIONET_EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#18181b] transition-colors flex items-center gap-1 cursor-pointer"
            >
              Contract Explorer
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </nav>
        </div>

        {/* Right side: Contract pill & Wallet connection */}
        <div className="flex items-center gap-3">
          {/* Contract address badge */}
          <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono bg-white border border-[#e7e5e0] px-2.5 py-1.5 rounded-md text-[#52525b] shadow-xs">
            <span className="text-[#a1a1aa]">Contract:</span>
            <span>{shortAddress(CONTRACT_ADDRESS)}</span>
            <button
              onClick={copyAddress}
              className="text-[#71717a] hover:text-[#18181b] p-0.5 transition-colors cursor-pointer"
              title="Copy Contract Address"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Wrong Chain Alert */}
          {walletState === 'WRONG_CHAIN' && (
            <button
              onClick={switchToStudionet}
              className="flex items-center gap-1.5 text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200 px-3 py-1.5 rounded-md hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Switch to Studionet</span>
            </button>
          )}

          {/* Connected State */}
          {walletState === 'CONNECTED' && account ? (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-white border border-[#e7e5e0] px-3 py-1.5 rounded-md shadow-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-mono font-medium text-[#18181b]">
                  {shortAddress(account)}
                </span>
              </div>
              <button
                onClick={disconnectWallet}
                className="text-xs font-medium text-[#71717a] hover:text-[#18181b] border border-[#e7e5e0] bg-white px-2.5 py-1.5 rounded-md hover:bg-[#f4f4f5] transition-colors cursor-pointer"
              >
                Disconnect
              </button>
            </div>
          ) : (
            /* Disconnected / Connecting State */
            <button
              onClick={openChooser}
              disabled={walletState === 'CONNECTING'}
              className="flex items-center gap-2 bg-[#18181b] text-white hover:bg-[#27272a] px-3.5 py-1.5 rounded-md text-sm font-medium transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span>{walletState === 'CONNECTING' ? 'Connecting...' : 'Connect Wallet'}</span>
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
