import React, { useState } from 'react'
import { useWallet } from '../context/WalletContext'
import { useTransaction } from '../context/TransactionContext'
import { submitCreateSpec, getWriteClient, fetchSpec } from '../services/contractService'
import { DEFAULT_SPEC_ID } from '../config/chain'
import { Search, Plus, X } from 'lucide-react'

interface SpecSelectorProps {
  currentSpecId: string
  onSelectSpecId: (specId: string) => void
}

export const SpecSelector: React.FC<SpecSelectorProps> = ({ currentSpecId, onSelectSpecId }) => {
  const { account, selectedWallet } = useWallet()
  const { executeTransaction, isBusy } = useTransaction()

  const [inputSpecId, setInputSpecId] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Form fields for new spec
  const [title, setTitle] = useState('')
  const [clause, setClause] = useState('')
  const [labelsCsv, setLabelsCsv] = useState('DELIVERED, BREACH')

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputSpecId.trim()) {
      onSelectSpecId(inputSpecId.trim())
      setInputSpecId('')
    }
  }

  const handleCreateSpec = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account || !selectedWallet || !title.trim() || !clause.trim()) return

    const client = getWriteClient(account, selectedWallet.provider)

    await executeTransaction(
      'Create Agreement Spec',
      () => submitCreateSpec(client, title.trim(), clause.trim(), labelsCsv.trim()),
      async () => {
        const rawLatest = await client.readContract({
          address: '0xf227D68595178A2192888c85E3550fEff4b79406',
          functionName: 'get_latest_spec',
          args: [account],
        })
        const latestId = typeof rawLatest === 'string' ? rawLatest.replace(/^"|"$/g, '') : null
        if (latestId && latestId.length >= 8) {
          const loaded = await fetchSpec(latestId)
          if (loaded) {
            onSelectSpecId(latestId)
            setShowCreateModal(false)
            setTitle('')
            setClause('')
            return true
          }
        }
        return false
      }
    )
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
      {/* Active Spec Selector Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[#71717a] font-medium">Agreement Case:</span>
        <button
          onClick={() => onSelectSpecId(DEFAULT_SPEC_ID)}
          className={`px-3 py-1.5 rounded-lg font-mono font-medium transition-all cursor-pointer ${
            currentSpecId === DEFAULT_SPEC_ID
              ? 'bg-[#18181b] text-white shadow-xs'
              : 'bg-white border border-[#e7e5e0] text-[#52525b] hover:border-[#a1a1aa]'
          }`}
        >
          {DEFAULT_SPEC_ID} (Live Evidence Demo)
        </button>

        {currentSpecId !== DEFAULT_SPEC_ID && (
          <span className="px-3 py-1.5 bg-[#18181b] text-white rounded-lg font-mono font-medium shadow-xs">
            {currentSpecId} (Active)
          </span>
        )}
      </div>

      {/* Action buttons: Lookup or Create */}
      <div className="flex items-center gap-2">
        <form onSubmit={handleLookup} className="flex items-center gap-1.5">
          <input
            type="text"
            value={inputSpecId}
            onChange={(e) => setInputSpecId(e.target.value)}
            placeholder="Spec ID (12 hex)..."
            className="w-32 sm:w-36 text-xs p-1.5 px-2.5 border border-[#e7e5e0] bg-white rounded-md font-mono focus:outline-hidden focus:ring-1 focus:ring-[#18181b]"
          />
          <button
            type="submit"
            disabled={!inputSpecId.trim()}
            className="p-1.5 px-2.5 bg-white border border-[#e7e5e0] text-[#52525b] hover:text-[#18181b] rounded-md text-xs font-medium hover:bg-[#f4f4f5] transition-colors disabled:opacity-40 cursor-pointer"
            title="Load Spec"
          >
            <Search className="w-3.5 h-3.5" />
          </button>
        </form>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#e7e5e0] text-[#18181b] hover:bg-[#faf9f5] rounded-md font-medium transition-colors shadow-xs cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Spec</span>
        </button>
      </div>

      {/* Create Spec Modal */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white border border-[#e7e5e0] rounded-xl shadow-xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#f4f4f5]">
              <div>
                <h3 className="text-base font-bold text-[#18181b]">Create Draft Agreement Spec</h3>
                <p className="text-xs text-[#71717a] mt-0.5">
                  Propose an agreement clause with defined binary or discrete outcome labels.
                </p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#a1a1aa] hover:text-[#18181b] p-1 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSpec} className="space-y-3.5">
              <div>
                <label className="text-xs font-medium text-[#52525b] block mb-1">
                  Agreement Title (Max 200 chars)
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Software Delivery Agreement"
                  maxLength={200}
                  className="w-full text-xs p-2.5 border border-[#d4d4d8] rounded-md font-sans bg-white focus:outline-hidden focus:ring-1 focus:ring-[#18181b]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#52525b] block mb-1">
                  Natural-Language Clause (Max 2000 chars)
                </label>
                <textarea
                  value={clause}
                  onChange={(e) => setClause(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="e.g. The contractor shall deliver the repository with pure ASCII code and passing tests within 7 calendar days of contract creation."
                  className="w-full text-xs p-2.5 border border-[#d4d4d8] rounded-md font-mono bg-white focus:outline-hidden focus:ring-1 focus:ring-[#18181b]"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-[#52525b] block mb-1">
                  Allowed Outcome Labels (2 to 5 comma-separated)
                </label>
                <input
                  type="text"
                  value={labelsCsv}
                  onChange={(e) => setLabelsCsv(e.target.value)}
                  placeholder="DELIVERED, BREACH"
                  className="w-full text-xs p-2.5 border border-[#d4d4d8] rounded-md font-mono bg-white focus:outline-hidden focus:ring-1 focus:ring-[#18181b]"
                  required
                />
                <span className="text-[11px] text-[#a1a1aa] mt-1 block">
                  Upper-case alphanumeric tags only. UNDECIDABLE and UNRELIABLE are reserved.
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#f4f4f5]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 border border-[#e7e5e0] rounded-md text-xs font-medium text-[#52525b] hover:bg-[#f4f4f5] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isBusy || !account || !title.trim() || !clause.trim()}
                  className="px-4 py-1.5 bg-[#18181b] text-white rounded-md text-xs font-medium hover:bg-[#27272a] disabled:opacity-50 transition-all cursor-pointer"
                >
                  Create Spec on Studionet
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
