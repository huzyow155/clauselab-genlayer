import React from 'react'
import type { SpecRecord, SuiteReport } from '../types/contract'
import { useWallet } from '../context/WalletContext'
import { useTransaction } from '../context/TransactionContext'
import { submitSign, submitLock, getWriteClient, fetchSpec } from '../services/contractService'
import { PenTool, Lock, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react'

interface LockingSectionProps {
  spec: SpecRecord
  suiteReport: SuiteReport | null
  onSpecUpdated: (spec: SpecRecord) => void
}

export const LockingSection: React.FC<LockingSectionProps> = ({
  spec,
  suiteReport,
  onSpecUpdated,
}) => {
  const { account, selectedWallet } = useWallet()
  const { executeTransaction, isBusy } = useTransaction()

  const isLocked = spec.status === 'LOCKED'
  const isParty = account && spec.parties.some((p) => p.toLowerCase() === account.toLowerCase())
  const hasSigned = account && spec.signed.some((s) => s.toLowerCase() === account.toLowerCase())

  const readyToLock = suiteReport?.ready_to_lock === true

  const handleSign = async () => {
    if (!account || !selectedWallet) return

    const client = getWriteClient(account, selectedWallet.provider)
    await executeTransaction(
      `Sign Agreement (v${spec.version})`,
      () => submitSign(client, spec.spec_id),
      async () => {
        const updated = await fetchSpec(spec.spec_id)
        if (updated && updated.signed.some((s) => s.toLowerCase() === account.toLowerCase())) {
          onSpecUpdated(updated)
          return true
        }
        return false
      },
      { specId: spec.spec_id }
    )
  }

  const handleLock = async () => {
    if (!account || !selectedWallet) return

    const client = getWriteClient(account, selectedWallet.provider)
    await executeTransaction(
      'Lock Agreement Spec',
      () => submitLock(client, spec.spec_id),
      async () => {
        const updated = await fetchSpec(spec.spec_id)
        if (updated && updated.status === 'LOCKED' && updated.spec_hash) {
          onSpecUpdated(updated)
          return true
        }
        return false
      },
      { specId: spec.spec_id }
    )
  }

  if (isLocked) {
    return (
      <div className="bg-white border border-[#e7e5e0] rounded-xl p-5 sm:p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#18181b]">Agreement Spec is Locked</h3>
            <p className="text-xs text-[#71717a] mt-0.5">
              The clause and scenario suite are permanently frozen under digest{' '}
              <span className="font-mono font-medium text-[#18181b]">{spec.spec_hash}</span>.
              Counterparties can now stipulate facts for adjudication.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-[#e7e5e0] rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
      <div>
        <h3 className="text-base font-bold text-[#18181b]">Dual Signatures & Spec Locking</h3>
        <p className="text-xs text-[#71717a] mt-0.5">
          All counterparties must sign version {spec.version}. Locking is only permitted once every adversarial scenario evaluates to green.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-[#faf9f5] border border-[#e7e5e0] rounded-xl">
        {/* Sign Status */}
        <div className="space-y-1">
          <div className="text-xs font-semibold text-[#18181b]">Your Signature Status</div>
          <div className="text-xs text-[#71717a]">
            {!account ? (
              'Connect wallet to sign'
            ) : !isParty ? (
              'You are not a registered party for this spec'
            ) : hasSigned ? (
              <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Signed for clause v{spec.version}
              </span>
            ) : (
              <span className="text-amber-700 font-medium inline-flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Signature required for clause v{spec.version}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          {/* Sign Button */}
          {isParty && !hasSigned && (
            <button
              onClick={handleSign}
              disabled={isBusy}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#18181b] text-white hover:bg-[#27272a] rounded-lg text-xs font-medium transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Sign Clause v{spec.version}</span>
            </button>
          )}

          {/* Lock Button */}
          <button
            onClick={handleLock}
            disabled={isBusy || !readyToLock || !isParty}
            className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all shadow-xs cursor-pointer ${
              readyToLock && isParty
                ? 'bg-emerald-700 hover:bg-emerald-800 text-white'
                : 'bg-[#f4f4f5] text-[#a1a1aa] border border-[#e4e4e7] cursor-not-allowed'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Lock Agreement Spec</span>
          </button>
        </div>
      </div>
    </div>
  )
}
