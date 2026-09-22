import React from 'react'
import { useTransaction } from '../context/TransactionContext'
import { Loader2, CheckCircle2, XCircle, AlertTriangle, ExternalLink, X, RefreshCw } from 'lucide-react'

export const TransactionOverlay: React.FC = () => {
  const { txState, isBusy, dismissTransaction, retryVerification, getExplorerUrl } = useTransaction()

  if (txState.phase === 'IDLE') return null

  const isSuccess = txState.phase === 'SUCCESS'
  const isFailed = txState.phase === 'FAILED'
  const isReconcile = txState.phase === 'RECONCILIATION_REQUIRED'

  return (
    <div
      role="region"
      aria-live="polite"
      className="fixed bottom-6 right-6 z-50 w-full max-w-sm bg-white border border-[#e7e5e0] rounded-xl shadow-xl p-4.5 animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="flex items-start gap-3.5">
        {/* Status Icon */}
        <div className="shrink-0 mt-0.5">
          {isBusy && <Loader2 className="w-5 h-5 text-[#18181b] animate-spin" />}
          {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          {isFailed && <XCircle className="w-5 h-5 text-red-600" />}
          {isReconcile && <AlertTriangle className="w-5 h-5 text-amber-600" />}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-semibold text-[#18181b] truncate">
              {txState.operationName || 'Transaction Status'}
            </h4>
            {!isBusy && (
              <button
                onClick={dismissTransaction}
                className="text-[#a1a1aa] hover:text-[#18181b] p-0.5 rounded cursor-pointer"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <p className="text-xs text-[#52525b] mt-1 leading-relaxed">
            {txState.humanMessage}
          </p>

          {/* Rollback / Error Payload */}
          {txState.errorMessage && (
            <div className="mt-2.5 p-2 bg-red-50/80 border border-red-200/80 rounded-md text-xs font-mono text-red-700 break-words">
              {txState.errorMessage}
            </div>
          )}

          {/* Transaction Link */}
          {txState.txHash && (
            <div className="mt-2.5 pt-2 border-t border-[#f4f4f5] flex items-center justify-between text-xs">
              <span className="text-[#a1a1aa] font-mono">
                Tx: {txState.txHash.slice(0, 8)}...{txState.txHash.slice(-6)}
              </span>
              <a
                href={getExplorerUrl(txState.txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#18181b] hover:underline flex items-center gap-1 font-medium"
              >
                Explorer <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}

          {/* Retry verification action */}
          {isReconcile && (
            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={retryVerification}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#18181b] text-white hover:bg-[#27272a] rounded-md text-xs font-medium transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Verify state update</span>
              </button>
              <button
                onClick={dismissTransaction}
                className="px-2.5 py-1.5 border border-[#e7e5e0] text-[#52525b] hover:bg-[#f4f4f5] rounded-md text-xs transition-colors cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
