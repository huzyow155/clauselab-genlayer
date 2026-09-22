import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { TransactionPhase, PendingTransaction } from '../types/contract'
import { STUDIONET_EXPLORER_URL } from '../config/chain'

export interface TransactionState {
  phase: TransactionPhase
  txHash: string | null
  operationName: string
  humanMessage: string
  errorMessage: string | null
  errorPayload: string | null
  specId?: string
  factsId?: string
}

export interface TransactionContextValue {
  txState: TransactionState
  isBusy: boolean
  executeTransaction: (
    operationName: string,
    action: () => Promise<string>,
    verifyReadback?: () => Promise<boolean>,
    meta?: { specId?: string; factsId?: string }
  ) => Promise<boolean>
  retryVerification: () => Promise<void>
  dismissTransaction: () => void
  getExplorerUrl: (txHash: string) => string
}

const STORAGE_KEY = 'clauselab_pending_tx_v1'

const TransactionContext = createContext<TransactionContextValue | undefined>(undefined)

function getHumanPhaseMessage(phase: TransactionPhase, customOp?: string): string {
  switch (phase) {
    case 'WAITING_FOR_WALLET':
      return 'Confirm the request in your wallet'
    case 'SUBMITTED':
      return 'Transaction submitted to GenLayer'
    case 'WAITING_FOR_FINALITY':
      return 'Waiting for multi-validator consensus...'
    case 'VERIFYING_EXECUTION':
      return 'Checking the consensus result...'
    case 'VERIFYING_READBACK':
      return 'Verifying contract state transition...'
    case 'SUCCESS':
      return `${customOp || 'Action'} completed successfully`
    case 'FAILED':
      return 'Transaction execution failed'
    case 'RECONCILIATION_REQUIRED':
      return 'Transaction submitted, but updated state could not be confirmed yet'
    default:
      return ''
  }
}

export const TransactionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [txState, setTxState] = useState<TransactionState>({
    phase: 'IDLE',
    txHash: null,
    operationName: '',
    humanMessage: '',
    errorMessage: null,
    errorPayload: null,
  })

  const [lastReadbackVerifier, setLastReadbackVerifier] = useState<(() => Promise<boolean>) | null>(null)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const item: PendingTransaction = JSON.parse(stored)
        if (Date.now() - item.timestamp < 10 * 60 * 1000) {
          setTxState({
            phase: 'RECONCILIATION_REQUIRED',
            txHash: item.txHash,
            operationName: item.operation,
            humanMessage: 'Previous transaction detected. You can verify its state.',
            errorMessage: null,
            errorPayload: null,
            specId: item.specId,
            factsId: item.factsId,
          })
        } else {
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [])

  const dismissTransaction = useCallback(() => {
    if (txState.phase !== 'WAITING_FOR_FINALITY' && txState.phase !== 'VERIFYING_EXECUTION') {
      localStorage.removeItem(STORAGE_KEY)
      setTxState({
        phase: 'IDLE',
        txHash: null,
        operationName: '',
        humanMessage: '',
        errorMessage: null,
        errorPayload: null,
      })
      setLastReadbackVerifier(null)
    }
  }, [txState.phase])

  const executeTransaction = useCallback(
    async (
      operationName: string,
      action: () => Promise<string>,
      verifyReadback?: () => Promise<boolean>,
      meta?: { specId?: string; factsId?: string }
    ): Promise<boolean> => {
      setLastReadbackVerifier(() => verifyReadback || null)

      setTxState({
        phase: 'WAITING_FOR_WALLET',
        txHash: null,
        operationName,
        humanMessage: getHumanPhaseMessage('WAITING_FOR_WALLET', operationName),
        errorMessage: null,
        errorPayload: null,
        specId: meta?.specId,
        factsId: meta?.factsId,
      })

      let hash = ''
      try {
        hash = await action()
      } catch (walletErr: any) {
        console.error('Wallet error:', walletErr)
        const msg = walletErr.message?.includes('User rejected')
          ? 'Transaction cancelled in wallet.'
          : walletErr.message || 'Failed to submit transaction.'
        setTxState({
          phase: 'FAILED',
          txHash: null,
          operationName,
          humanMessage: 'Action cancelled or rejected',
          errorMessage: msg,
          errorPayload: null,
        })
        return false
      }

      setTxState((prev) => ({
        ...prev,
        phase: 'SUBMITTED',
        txHash: hash,
        humanMessage: getHumanPhaseMessage('SUBMITTED', operationName),
      }))

      const pendingItem: PendingTransaction = {
        id: hash,
        operation: operationName,
        txHash: hash,
        specId: meta?.specId,
        factsId: meta?.factsId,
        timestamp: Date.now(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(pendingItem))

      setTxState((prev) => ({
        ...prev,
        phase: 'WAITING_FOR_FINALITY',
        humanMessage: getHumanPhaseMessage('WAITING_FOR_FINALITY', operationName),
      }))

      try {
        const { createClient } = await import('genlayer-js')
        const { STUDIONET_CHAIN_CONFIG } = await import('../config/chain')
        const client = createClient({ chain: STUDIONET_CHAIN_CONFIG })

        const receipt: any = await client.waitForTransactionReceipt({
          hash: hash as any,
          retries: 120,
          interval: 3000,
        })

        setTxState((prev) => ({
          ...prev,
          phase: 'VERIFYING_EXECUTION',
          humanMessage: getHumanPhaseMessage('VERIFYING_EXECUTION', operationName),
        }))

        const leader = receipt?.consensus_data?.leader_receipt?.[0]
        const executionResult = leader?.execution_result || receipt?.status_name || receipt?.statusName

        if (executionResult === 'ERROR' || leader?.result?.status === 'rollback') {
          const leaderResult = leader?.result as any
          const payload =
            typeof leaderResult?.payload === 'string'
              ? leaderResult.payload
              : JSON.stringify(leaderResult?.payload || 'Transaction execution rolled back by validators')

          localStorage.removeItem(STORAGE_KEY)
          setTxState((prev) => ({
            ...prev,
            phase: 'FAILED',
            humanMessage: 'Execution stopped by contract rules',
            errorMessage: payload,
            errorPayload: payload,
          }))
          return false
        }

        setTxState((prev) => ({
          ...prev,
          phase: 'VERIFYING_READBACK',
          humanMessage: getHumanPhaseMessage('VERIFYING_READBACK', operationName),
        }))

        if (verifyReadback) {
          let confirmed = false
          for (let attempt = 0; attempt < 5; attempt++) {
            confirmed = await verifyReadback()
            if (confirmed) break
            await new Promise((r) => setTimeout(r, 2000))
          }

          if (!confirmed) {
            setTxState((prev) => ({
              ...prev,
              phase: 'RECONCILIATION_REQUIRED',
              humanMessage: 'Transaction committed on-chain, but updated state is taking longer to reflect. Click Verify to refresh.',
              errorMessage: null,
            }))
            return false
          }
        }

        localStorage.removeItem(STORAGE_KEY)
        setTxState((prev) => ({
          ...prev,
          phase: 'SUCCESS',
          humanMessage: getHumanPhaseMessage('SUCCESS', operationName),
          errorMessage: null,
          errorPayload: null,
        }))
        return true
      } catch (err: any) {
        console.error('Finality / execution error:', err)
        setTxState((prev) => ({
          ...prev,
          phase: 'RECONCILIATION_REQUIRED',
          humanMessage: 'Network consensus took longer than expected. The transaction may still finalize.',
          errorMessage: err.message || 'Failed waiting for consensus',
        }))
        return false
      }
    },
    []
  )

  const retryVerification = useCallback(async () => {
    if (!lastReadbackVerifier) return

    setTxState((prev) => ({
      ...prev,
      phase: 'VERIFYING_READBACK',
      humanMessage: 'Re-verifying authoritative contract state...',
      errorMessage: null,
    }))

    try {
      const ok = await lastReadbackVerifier()
      if (ok) {
        localStorage.removeItem(STORAGE_KEY)
        setTxState((prev) => ({
          ...prev,
          phase: 'SUCCESS',
          humanMessage: `${prev.operationName || 'Action'} verified successfully`,
        }))
      } else {
        setTxState((prev) => ({
          ...prev,
          phase: 'RECONCILIATION_REQUIRED',
          humanMessage: 'State transition not detected yet. You can retry in a few moments.',
        }))
      }
    } catch (e: any) {
      setTxState((prev) => ({
        ...prev,
        phase: 'RECONCILIATION_REQUIRED',
        errorMessage: e.message || 'Verification check failed',
      }))
    }
  }, [lastReadbackVerifier])

  const getExplorerUrl = useCallback((hash: string): string => {
    return `${STUDIONET_EXPLORER_URL}/tx/${hash}`
  }, [])

  const isBusy =
    txState.phase === 'WAITING_FOR_WALLET' ||
    txState.phase === 'SUBMITTED' ||
    txState.phase === 'WAITING_FOR_FINALITY' ||
    txState.phase === 'VERIFYING_EXECUTION' ||
    txState.phase === 'VERIFYING_READBACK'

  return (
    <TransactionContext.Provider
      value={{
        txState,
        isBusy,
        executeTransaction,
        retryVerification,
        dismissTransaction,
        getExplorerUrl,
      }}
    >
      {children}
    </TransactionContext.Provider>
  )
}

export const useTransaction = (): TransactionContextValue => {
  const context = useContext(TransactionContext)
  if (!context) {
    throw new Error('useTransaction must be used within a TransactionProvider')
  }
  return context
}
