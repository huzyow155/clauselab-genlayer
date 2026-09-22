import React from 'react'
import type { SpecRecord, FactsRecord, RulingRecord } from '../types/contract'
import { useWallet } from '../context/WalletContext'
import { useTransaction } from '../context/TransactionContext'
import { submitAdjudicate, getWriteClient, fetchRuling } from '../services/contractService'
import { Scale, Clock } from 'lucide-react'

interface AdjudicationSectionProps {
  spec: SpecRecord
  facts: FactsRecord | null
  ruling: RulingRecord | null
  onRulingReceived: (ruling: RulingRecord) => void
}

export const AdjudicationSection: React.FC<AdjudicationSectionProps> = ({
  spec,
  facts,
  ruling,
  onRulingReceived,
}) => {
  const { account, selectedWallet } = useWallet()
  const { executeTransaction, isBusy } = useTransaction()

  const isLocked = spec.status === 'LOCKED'
  const isParty = account && spec.parties.some((p) => p.toLowerCase() === account.toLowerCase())
  const hasConfirmedFacts = (facts?.by?.length || 0) >= 2

  const handleAdjudicate = async () => {
    if (!account || !selectedWallet || !facts) return

    const client = getWriteClient(account, selectedWallet.provider)
    await executeTransaction(
      'Execute Consensus Adjudication',
      () => submitAdjudicate(client, spec.spec_id, facts.facts_id),
      async () => {
        const res = await fetchRuling(spec.spec_id, facts.facts_id)
        if (res && res.verdict) {
          onRulingReceived(res)
          return true
        }
        return false
      },
      { specId: spec.spec_id, factsId: facts.facts_id }
    )
  }

  if (ruling) return null

  if (!isLocked || !hasConfirmedFacts) {
    return (
      <div className="bg-white border border-[#e7e5e0] rounded-xl p-5 sm:p-6 shadow-xs opacity-60">
        <h3 className="text-base font-bold text-[#18181b]">Stage 4: Adjudication</h3>
        <p className="text-xs text-[#71717a] mt-1">
          Requires a locked spec and dispute facts confirmed by at least 2 distinct counterparties.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#e7e5e0] rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
      <div>
        <h3 className="text-base font-bold text-[#18181b]">
          Stage 4: In-Band Canary Adjudication
        </h3>
        <p className="text-xs text-[#71717a] mt-0.5">
          Trigger independent GenLayer validator nodes to calibrate on a held-back edge case and adjudicate the confirmed dispute facts.
        </p>
      </div>

      <div className="p-4 bg-[#faf9f5] border border-[#e7e5e0] rounded-xl space-y-3">
        <div className="flex items-start gap-3">
          <Scale className="w-5 h-5 text-[#18181b] shrink-0 mt-0.5" />
          <div className="text-xs text-[#52525b] leading-relaxed space-y-1">
            <div className="font-semibold text-[#18181b]">Validator Execution Process:</div>
            <div>1. Up to 3 settled green scenarios are injected as few-shot anchors.</div>
            <div>2. One held-back settled scenario is evaluated as an in-band canary.</div>
            <div>3. The disputed facts are evaluated against the locked clause.</div>
            <div>4. Strict consensus compares both the canary pass and the substantive verdict atomically.</div>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#71717a] pt-1">
          <Clock className="w-3.5 h-3.5 text-[#a1a1aa]" />
          <span>Expected consensus latency: ~28s (2 non-deterministic LLM rounds per validator)</span>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1">
        <div className="text-xs text-[#71717a]">
          {!isParty && 'Connect as an invited party to trigger adjudication'}
        </div>

        <button
          onClick={handleAdjudicate}
          disabled={isBusy || !isParty}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#18181b] text-white hover:bg-[#27272a] rounded-lg text-sm font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
        >
          <Scale className="w-4 h-4" />
          <span>Adjudicate Dispute on Studionet</span>
        </button>
      </div>
    </div>
  )
}
