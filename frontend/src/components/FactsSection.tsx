import React, { useState } from 'react'
import type { SpecRecord, FactsRecord } from '../types/contract'
import { useWallet } from '../context/WalletContext'
import { useTransaction } from '../context/TransactionContext'
import {
  submitStipulateFacts,
  submitConfirmFacts,
  getWriteClient,
  fetchFacts,
  fetchLatestFactsId
} from '../services/contractService'
import { UserCheck, Plus, Check } from 'lucide-react'

interface FactsSectionProps {
  spec: SpecRecord
  facts: FactsRecord | null
  onFactsUpdated: (facts: FactsRecord) => void
}

export const FactsSection: React.FC<FactsSectionProps> = ({ spec, facts, onFactsUpdated }) => {
  const { account, selectedWallet } = useWallet()
  const { executeTransaction, isBusy } = useTransaction()

  const [isStipulating, setIsStipulating] = useState(false)
  const [factsText, setFactsText] = useState('')

  const isLocked = spec.status === 'LOCKED'
  const isParty = account && spec.parties.some((p) => p.toLowerCase() === account.toLowerCase())
  const hasConfirmed = account && facts?.by?.some((p) => p.toLowerCase() === account.toLowerCase())
  const confirmedCount = facts?.by?.length || 0
  const isReadyForAdjudication = confirmedCount >= 2

  const handleStipulate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account || !selectedWallet || !factsText.trim()) return

    const client = getWriteClient(account, selectedWallet.provider)
    await executeTransaction(
      'Stipulate Dispute Facts',
      () => submitStipulateFacts(client, spec.spec_id, factsText.trim()),
      async () => {
        const latestId = await fetchLatestFactsId(spec.spec_id)
        if (latestId) {
          const newFacts = await fetchFacts(spec.spec_id, latestId)
          if (newFacts) {
            onFactsUpdated(newFacts)
            setFactsText('')
            setIsStipulating(false)
            return true
          }
        }
        return false
      },
      { specId: spec.spec_id }
    )
  }

  const handleConfirm = async () => {
    if (!account || !selectedWallet || !facts) return

    const client = getWriteClient(account, selectedWallet.provider)
    await executeTransaction(
      'Confirm Dispute Facts',
      () => submitConfirmFacts(client, spec.spec_id, facts.facts_id),
      async () => {
        const updated = await fetchFacts(spec.spec_id, facts.facts_id)
        if (updated && updated.by.some((p) => p.toLowerCase() === account.toLowerCase())) {
          onFactsUpdated(updated)
          return true
        }
        return false
      },
      { specId: spec.spec_id, factsId: facts.facts_id }
    )
  }

  const short = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  if (!isLocked) {
    return (
      <div className="bg-white border border-[#e7e5e0] rounded-xl p-5 sm:p-6 shadow-xs opacity-60">
        <h3 className="text-base font-bold text-[#18181b]">Stage 3: Fact Stipulation</h3>
        <p className="text-xs text-[#71717a] mt-1">
          Available once the agreement spec is signed and locked.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#e7e5e0] rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#f4f4f5]">
        <div>
          <h3 className="text-base font-bold text-[#18181b]">
            Stipulated Dispute Facts
          </h3>
          <p className="text-xs text-[#71717a] mt-0.5">
            Adjudication requires factual events agreed upon by at least two distinct counterparties.
          </p>
        </div>

        {isParty && !facts && (
          <button
            onClick={() => setIsStipulating(!isStipulating)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18181b] text-white hover:bg-[#27272a] rounded-md text-xs font-medium transition-all shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isStipulating ? 'Cancel' : 'Stipulate New Facts'}</span>
          </button>
        )}
      </div>

      {/* Stipulation Form */}
      {isStipulating && (
        <form onSubmit={handleStipulate} className="p-4 bg-[#faf9f5] border border-[#e7e5e0] rounded-lg space-y-3">
          <h4 className="text-xs font-semibold text-[#18181b]">Stipulate Dispute Facts</h4>
          <div>
            <label className="text-[11px] font-medium text-[#71717a] block mb-1">
              Natural Language Statement of Facts (Max 1500 chars)
            </label>
            <textarea
              value={factsText}
              onChange={(e) => setFactsText(e.target.value)}
              rows={3}
              maxLength={1500}
              placeholder="e.g. The contractor pushed the complete repository with pure ASCII code and passing tests on calendar day 3..."
              className="w-full text-xs p-2.5 border border-[#d4d4d8] rounded-md bg-white font-mono focus:outline-hidden focus:ring-1 focus:ring-[#18181b]"
              required
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-[#a1a1aa]">{factsText.length}/1500 characters</span>
            <button
              type="submit"
              disabled={isBusy || !factsText.trim()}
              className="px-3.5 py-1.5 bg-[#18181b] text-white rounded-md text-xs font-medium hover:bg-[#27272a] transition-all disabled:opacity-50 cursor-pointer"
            >
              Submit Stipulated Facts
            </button>
          </div>
        </form>
      )}

      {/* Active Facts Record */}
      {facts ? (
        <div className="space-y-4">
          <div className="p-4 bg-[#faf9f5] border border-[#e7e5e0] rounded-lg space-y-2">
            <div className="flex items-center justify-between text-xs font-mono text-[#71717a]">
              <span>
                Facts ID: <strong className="text-[#18181b]">{facts.facts_id}</strong>
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-sans font-medium ${
                  isReadyForAdjudication
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {confirmedCount} / 2 Confirmations
              </span>
            </div>
            <p className="text-xs font-mono text-[#27272a] leading-relaxed select-text">
              &ldquo;{facts.text}&rdquo;
            </p>
          </div>

          {/* Confirmations List & Action */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3 bg-white border border-[#e7e5e0] rounded-lg">
            <div className="text-xs">
              <span className="font-semibold text-[#52525b]">Confirmed by:</span>
              <div className="flex items-center gap-2 mt-1 flex-wrap font-mono text-[11px]">
                {facts.by.map((party) => (
                  <span
                    key={party}
                    className="inline-flex items-center gap-1 bg-[#f4f4f5] px-2 py-0.5 rounded text-[#18181b]"
                  >
                    <Check className="w-3 h-3 text-emerald-600" />
                    {short(party)}
                  </span>
                ))}
              </div>
            </div>

            {/* Confirm button for counterparties */}
            {isParty && !hasConfirmed && (
              <button
                onClick={handleConfirm}
                disabled={isBusy}
                className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[#18181b] text-white hover:bg-[#27272a] rounded-md text-xs font-medium transition-all shadow-xs disabled:opacity-50 cursor-pointer self-start sm:self-auto shrink-0"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>Confirm Facts As Agreed</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="py-8 text-center border border-dashed border-[#e7e5e0] rounded-lg text-xs text-[#71717a]">
          No dispute facts stipulated yet. Counterparties can submit facts to proceed to adjudication.
        </div>
      )}
    </div>
  )
}
