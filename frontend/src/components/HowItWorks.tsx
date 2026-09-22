import React, { useEffect } from 'react'
import { X, Clock } from 'lucide-react'

interface HowItWorksProps {
  isOpen: boolean
  onClose: () => void
}

export const HowItWorks: React.FC<HowItWorksProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (isOpen) window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="how-it-works-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white border border-[#e7e5e0] rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-4 border-b border-[#f4f4f5]">
          <div>
            <h3 id="how-it-works-title" className="text-lg font-bold text-[#18181b]">
              How ClauseLab Works
            </h3>
            <p className="text-xs text-[#71717a] mt-0.5">
              Pre-signing ambiguity detection and canary calibration on GenLayer.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-[#a1a1aa] hover:text-[#18181b] p-1 rounded-lg hover:bg-[#f4f4f5] cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 5 Step Walkthrough */}
        <div className="space-y-4 text-xs text-[#52525b] leading-relaxed">
          <div className="flex items-start gap-3 p-3.5 bg-[#faf9f5] border border-[#e7e5e0] rounded-xl">
            <div className="w-6 h-6 rounded-full bg-[#18181b] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
              1
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#18181b]">Collaborative Draft & Adversarial Scenarios</h4>
              <p className="mt-1">
                The author drafts a natural-language clause with allowed outcome labels (e.g. <code>DELIVERED, BREACH</code>). Every party proposes hypothetical situations with their expected label to test boundary conditions before signing.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-[#faf9f5] border border-[#e7e5e0] rounded-xl">
            <div className="w-6 h-6 rounded-full bg-[#18181b] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
              2
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#18181b]">Pre-Signing Validator Consensus Gate</h4>
              <p className="mt-1">
                GenLayer validators evaluate each scenario using the Equivalence Principle (<code>strict_eq</code>). If validators classify a scenario as <code>UNDECIDABLE</code> or disagree with the expected label, the scenario turns <strong className="text-red-700">RED</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-[#faf9f5] border border-[#e7e5e0] rounded-xl">
            <div className="w-6 h-6 rounded-full bg-[#18181b] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
              3
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#18181b]">Dual Signatures & Spec Locking</h4>
              <p className="mt-1">
                Parties amend vague text until all scenarios turn <strong className="text-emerald-700">GREEN</strong>. Once all counterparties sign and conditions pass (min 4 scenarios across 2 labels), the spec is locked and an immutable <code>spec_hash</code> digest is recorded.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-[#faf9f5] border border-[#e7e5e0] rounded-xl">
            <div className="w-6 h-6 rounded-full bg-[#18181b] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
              4
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#18181b]">Stipulating and Confirming Dispute Facts</h4>
              <p className="mt-1">
                If an execution dispute occurs, a party stipulates factual claims. At least two distinct counterparties must confirm the facts to prevent unilateral or unsubstantiated claims before adjudication.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-[#faf9f5] border border-[#e7e5e0] rounded-xl">
            <div className="w-6 h-6 rounded-full bg-[#18181b] text-white flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
              5
            </div>
            <div>
              <h4 className="font-semibold text-sm text-[#18181b]">In-Band Canary Calibration & Adjudication</h4>
              <p className="mt-1">
                During adjudication, settled green scenarios act as few-shot anchors, while one held-back scenario serves as an in-band canary. If the validator model fails the known canary test, the verdict is flagged as <code>UNRELIABLE</code> rather than rendering a false verdict.
              </p>
            </div>
          </div>
        </div>

        {/* Performance & Security Note */}
        <div className="p-3 bg-[#f4f4f5] rounded-xl text-[11px] text-[#71717a] space-y-1">
          <div className="font-medium text-[#18181b] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#52525b]" />
            Consensus Latency Breakdown
          </div>
          <div>
            Scenario evaluation takes ~12s (1 inference round). Dispute adjudication takes ~28s (2 inference rounds for canary calibration + facts ruling). All state changes are finalized by multi-validator consensus on GenLayer Studionet.
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[#18181b] text-white text-xs font-medium rounded-lg hover:bg-[#27272a] transition-all cursor-pointer"
          >
            Got it, back to app
          </button>
        </div>
      </div>
    </div>
  )
}
