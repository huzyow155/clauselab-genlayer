import React, { useState } from 'react'
import type { SpecRecord } from '../types/contract'
import { useWallet } from '../context/WalletContext'
import { useTransaction } from '../context/TransactionContext'
import { submitInvite, submitAmendClause, getWriteClient, fetchSpec } from '../services/contractService'
import { Lock, UserPlus, Edit3, ShieldCheck, Check, Copy } from 'lucide-react'

interface SpecOverviewProps {
  spec: SpecRecord
  onSpecUpdated: (spec: SpecRecord) => void
}

export const SpecOverview: React.FC<SpecOverviewProps> = ({ spec, onSpecUpdated }) => {
  const { account, selectedWallet } = useWallet()
  const { executeTransaction, isBusy } = useTransaction()

  const [isAmending, setIsAmending] = useState(false)
  const [newClause, setNewClause] = useState(spec.clause)
  const [inviteAddress, setInviteAddress] = useState('')
  const [isInviting, setIsInviting] = useState(false)
  const [copiedHash, setCopiedHash] = useState(false)

  const isLocked = spec.status === 'LOCKED'
  const isAuthor = account && account.toLowerCase() === spec.author.toLowerCase()
  const isParty = account && spec.parties.some((p) => p.toLowerCase() === account.toLowerCase())

  const handleAmend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account || !selectedWallet || !newClause.trim()) return

    const client = getWriteClient(account, selectedWallet.provider)
    await executeTransaction(
      'Amend Agreement Clause',
      () => submitAmendClause(client, spec.spec_id, newClause.trim()),
      async () => {
        const updated = await fetchSpec(spec.spec_id)
        if (updated && updated.version > spec.version) {
          onSpecUpdated(updated)
          setIsAmending(false)
          return true
        }
        return false
      },
      { specId: spec.spec_id }
    )
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!account || !selectedWallet || !inviteAddress.trim()) return

    const client = getWriteClient(account, selectedWallet.provider)
    await executeTransaction(
      'Invite Counterparty',
      () => submitInvite(client, spec.spec_id, inviteAddress.trim()),
      async () => {
        const updated = await fetchSpec(spec.spec_id)
        if (updated && updated.parties.some((p) => p.toLowerCase() === inviteAddress.trim().toLowerCase())) {
          onSpecUpdated(updated)
          setInviteAddress('')
          setIsInviting(false)
          return true
        }
        return false
      },
      { specId: spec.spec_id }
    )
  }

  const copySpecHash = () => {
    if (!spec.spec_hash) return
    navigator.clipboard.writeText(spec.spec_hash)
    setCopiedHash(true)
    setTimeout(() => setCopiedHash(false), 2000)
  }

  const short = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <div className="bg-white border border-[#e7e5e0] rounded-xl p-5 sm:p-6 shadow-xs space-y-6">
      {/* Spec Header & Metadata */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-[#f4f4f5]">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl font-bold text-[#18181b] tracking-tight">{spec.title}</h2>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-medium inline-flex items-center gap-1 ${
                isLocked
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border border-amber-200'
              }`}
            >
              {isLocked ? <Lock className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
              {spec.status} (v{spec.version})
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono text-[#71717a] mt-2 flex-wrap">
            <span>
              Spec ID: <strong className="text-[#18181b]">{spec.spec_id}</strong>
            </span>
            <span>&bull;</span>
            <span>
              Author: <strong className="text-[#18181b]">{short(spec.author)}</strong>
            </span>
            <span>&bull;</span>
            <span>
              Allowed Labels: {spec.labels.map((l) => (
                <span key={l} className="ml-1 px-1.5 py-0.5 bg-[#f4f4f5] text-[#18181b] rounded text-[11px]">
                  {l}
                </span>
              ))}
            </span>
          </div>
        </div>

        {/* Spec Hash (if locked) */}
        {isLocked && spec.spec_hash && (
          <div className="bg-[#faf9f5] border border-[#e7e5e0] rounded-lg p-2.5 flex items-center gap-2 shrink-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="text-xs font-mono">
              <div className="text-[10px] uppercase text-[#71717a] font-sans">Locked Spec Hash</div>
              <div className="text-[#18181b] font-medium">
                {spec.spec_hash.slice(0, 10)}...{spec.spec_hash.slice(-8)}
              </div>
            </div>
            <button
              onClick={copySpecHash}
              className="text-[#71717a] hover:text-[#18181b] p-1 transition-colors cursor-pointer"
              title="Copy Spec Hash"
            >
              {copiedHash ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        )}
      </div>

      {/* Clause Text Box */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-[#52525b] uppercase tracking-wider">
            Natural-Language Clause
          </label>
          {!isLocked && isParty && (
            <button
              onClick={() => setIsAmending(!isAmending)}
              className="text-xs font-medium text-[#18181b] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Edit3 className="w-3 h-3" />
              {isAmending ? 'Cancel editing' : 'Amend clause'}
            </button>
          )}
        </div>

        {isAmending ? (
          <form onSubmit={handleAmend} className="space-y-3">
            <textarea
              value={newClause}
              onChange={(e) => setNewClause(e.target.value)}
              rows={3}
              maxLength={2000}
              className="w-full text-xs p-3 border border-[#d4d4d8] rounded-lg focus:outline-hidden focus:ring-2 focus:ring-[#18181b] font-mono bg-white"
              placeholder="Enter refined, unambiguous clause..."
              required
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#a1a1aa]">{newClause.length}/2000 characters</span>
              <button
                type="submit"
                disabled={isBusy || newClause.trim() === spec.clause}
                className="px-3.5 py-1.5 bg-[#18181b] text-white rounded-md text-xs font-medium hover:bg-[#27272a] transition-all disabled:opacity-50 cursor-pointer"
              >
                Save & Increment Version
              </button>
            </div>
          </form>
        ) : (
          <div className="p-4 bg-[#faf9f5] border border-[#e7e5e0] rounded-lg text-sm text-[#27272a] font-mono leading-relaxed select-text">
            &ldquo;{spec.clause}&rdquo;
          </div>
        )}
      </div>

      {/* Parties & Signatures Grid */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-semibold text-[#52525b] uppercase tracking-wider">
            Participants ({spec.parties.length}/4)
          </h4>
          {!isLocked && isAuthor && spec.parties.length < 4 && (
            <button
              onClick={() => setIsInviting(!isInviting)}
              className="text-xs font-medium text-[#18181b] hover:underline flex items-center gap-1 cursor-pointer"
            >
              <UserPlus className="w-3 h-3" />
              {isInviting ? 'Cancel invite' : 'Invite counterparty'}
            </button>
          )}
        </div>

        {/* Invite Form */}
        {isInviting && (
          <form onSubmit={handleInvite} className="mb-3 p-3 bg-[#faf9f5] border border-[#e7e5e0] rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inviteAddress}
                onChange={(e) => setInviteAddress(e.target.value)}
                placeholder="0x... (42-character Ethereum address)"
                className="flex-1 text-xs p-2 border border-[#d4d4d8] rounded-md font-mono bg-white focus:outline-hidden focus:ring-1 focus:ring-[#18181b]"
                required
              />
              <button
                type="submit"
                disabled={isBusy || !inviteAddress.trim()}
                className="px-3 py-2 bg-[#18181b] text-white rounded-md text-xs font-medium hover:bg-[#27272a] transition-all disabled:opacity-50 cursor-pointer"
              >
                Send Invite
              </button>
            </div>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {spec.parties.map((p) => {
            const hasSigned = spec.signed.some((s) => s.toLowerCase() === p.toLowerCase())
            const isMe = account && account.toLowerCase() === p.toLowerCase()
            const isSpecAuthor = p.toLowerCase() === spec.author.toLowerCase()

            return (
              <div
                key={p}
                className="p-3 border border-[#e7e5e0] rounded-lg bg-white flex items-center justify-between text-xs font-mono"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[#18181b] font-medium">{short(p)}</span>
                  {isMe && (
                    <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-[#18181b] text-white font-medium">
                      You
                    </span>
                  )}
                  {isSpecAuthor && (
                    <span className="text-[10px] font-sans px-1.5 py-0.2 rounded bg-[#f4f4f5] text-[#71717a]">
                      Author
                    </span>
                  )}
                </div>
                <div className="shrink-0 flex items-center gap-1.5">
                  {hasSigned ? (
                    <span className="text-[11px] font-sans text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      Signed v{spec.version}
                    </span>
                  ) : (
                    <span className="text-[11px] font-sans text-[#71717a] bg-[#f4f4f5] px-2 py-0.5 rounded-full">
                      Not Signed
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
