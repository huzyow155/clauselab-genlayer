import React, { useState } from 'react'
import type { RulingRecord } from '../types/contract'
import { STUDIONET_EXPLORER_URL, CONTRACT_ADDRESS } from '../config/chain'
import { ShieldCheck, AlertOctagon, CheckCircle2, Copy, Check, ExternalLink } from 'lucide-react'

interface AdjudicationResultViewProps {
  ruling: RulingRecord
}

export const AdjudicationResultView: React.FC<AdjudicationResultViewProps> = ({ ruling }) => {
  const [copiedHash, setCopiedHash] = useState(false)

  const isUnreliable = ruling.verdict === 'UNRELIABLE'
  const isDelivered = ruling.verdict === 'DELIVERED'
  const isBreach = ruling.verdict === 'BREACH'

  const copyDigest = () => {
    navigator.clipboard.writeText(ruling.spec_hash)
    setCopiedHash(true)
    setTimeout(() => setCopiedHash(false), 2000)
  }

  return (
    <div className="bg-white border-2 border-[#18181b] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Top Banner / Label */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-[#e7e5e0]">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs uppercase tracking-wider font-semibold text-[#52525b]">
            Authoritative Consensus Ruling
          </span>
        </div>
        <div className="text-xs font-mono text-[#71717a]">
          Schema v{ruling.schema_version || '1.0'} &bull; Facts ID: <span className="text-[#18181b] font-medium">{ruling.facts_id}</span>
        </div>
      </div>

      {/* Primary Verdict Showcase */}
      <div className="text-center py-4 space-y-2">
        <div className="text-xs uppercase font-mono tracking-widest text-[#71717a]">
          Adjudicated Verdict
        </div>
        <div className="text-4xl sm:text-5xl font-black tracking-tight text-[#18181b] font-mono">
          {ruling.verdict}
        </div>
        <p className="text-xs text-[#52525b] max-w-md mx-auto pt-1 leading-relaxed">
          {isDelivered && 'Independent GenLayer validators reached strict consensus that terms were fulfilled under the agreed clause.'}
          {isBreach && 'Independent GenLayer validators reached strict consensus that terms were breached under the agreed clause.'}
          {isUnreliable && 'Judge model failed the in-band canary validation. Consensus abstains from ruling to prevent false judgment.'}
        </p>
      </div>

      {/* Substantive Fields Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        {/* In-Band Canary Calibration */}
        <div className="p-4 bg-[#faf9f5] border border-[#e7e5e0] rounded-xl flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            {ruling.canary_pass ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <AlertOctagon className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-semibold text-[#18181b] flex items-center gap-1.5">
              <span>In-Band Canary Calibration:</span>
              <span className={ruling.canary_pass ? 'text-emerald-700 font-bold' : 'text-red-600 font-bold'}>
                {ruling.canary_pass ? 'PASS (1)' : 'FAIL (0)'}
              </span>
            </div>
            <p className="text-[11px] text-[#71717a] leading-relaxed">
              Validator model accurately evaluated the held-back settled scenario alongside the dispute.
            </p>
          </div>
        </div>

        {/* Spec Hash Binding */}
        <div className="p-4 bg-[#faf9f5] border border-[#e7e5e0] rounded-xl flex items-start gap-3">
          <div className="mt-0.5 shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#18181b]" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="text-xs font-semibold text-[#18181b]">Bound Spec Digest</div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#52525b] truncate">
                {ruling.spec_hash.slice(0, 10)}...{ruling.spec_hash.slice(-8)}
              </span>
              <button
                onClick={copyDigest}
                className="text-[#71717a] hover:text-[#18181b] p-0.5 transition-colors cursor-pointer shrink-0"
                title="Copy Full Spec Hash"
              >
                {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-[#71717a]">
              Guarantees ruling is bound to the exact immutable text and scenarios.
            </p>
          </div>
        </div>
      </div>

      {/* Explorer Verification Link */}
      <div className="pt-2 flex items-center justify-between text-xs text-[#71717a] border-t border-[#f4f4f5]">
        <span>Verified directly via GenLayer Studionet RPC</span>
        <a
          href={`${STUDIONET_EXPLORER_URL}/address/${CONTRACT_ADDRESS}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#18181b] hover:underline font-medium inline-flex items-center gap-1"
        >
          View On-Chain Contract <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  )
}
