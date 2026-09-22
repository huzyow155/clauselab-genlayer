import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { ReactNode } from 'react'
import {
  STUDIONET_CHAIN_ID,
  STUDIONET_CHAIN_ID_HEX,
  STUDIONET_NAME,
  STUDIONET_RPC_URL,
  STUDIONET_EXPLORER_URL
} from '../config/chain'

export interface EIP6963ProviderInfo {
  uuid: string
  name: string
  icon: string
  rdns: string
}

export interface EIP6963ProviderDetail {
  info: EIP6963ProviderInfo
  provider: any
}

export type WalletState =
  | 'DISCONNECTED'
  | 'DISCOVERING'
  | 'CHOOSER_OPEN'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'WRONG_CHAIN'
  | 'ERROR'

export interface WalletContextValue {
  walletState: WalletState
  account: string | null
  chainId: number | null
  selectedWallet: EIP6963ProviderDetail | null
  discoveredWallets: EIP6963ProviderDetail[]
  errorMessage: string | null
  openChooser: () => void
  closeChooser: () => void
  connectWallet: (wallet: EIP6963ProviderDetail) => Promise<void>
  disconnectWallet: () => void
  switchToStudionet: () => Promise<boolean>
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined)

// Supported wallets filter per specifications
function isSupportedWallet(info: EIP6963ProviderInfo): boolean {
  const name = (info.name || '').toLowerCase()
  const rdns = (info.rdns || '').toLowerCase()
  return (
    name.includes('metamask') ||
    rdns.includes('metamask') ||
    name.includes('rabby') ||
    rdns.includes('rabby') ||
    name.includes('okx') ||
    rdns.includes('okx')
  )
}

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [walletState, setWalletState] = useState<WalletState>('DISCONNECTED')
  const [discoveredWallets, setDiscoveredWallets] = useState<EIP6963ProviderDetail[]>([])
  const [selectedWallet, setSelectedWallet] = useState<EIP6963ProviderDetail | null>(null)
  const [account, setAccount] = useState<string | null>(null)
  const [chainId, setChainId] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  // Register EIP-6963 announcement listener for page lifetime
  useEffect(() => {
    setWalletState('DISCOVERING')

    const handleAnnounce = (event: Event) => {
      const customEvent = event as CustomEvent<EIP6963ProviderDetail>
      if (!customEvent.detail || !customEvent.detail.info) return

      const detail = customEvent.detail
      if (!isSupportedWallet(detail.info)) return

      setDiscoveredWallets((prev) => {
        const exists = prev.some(
          (w) => w.info.rdns === detail.info.rdns || w.info.uuid === detail.info.uuid
        )
        if (exists) return prev
        return [...prev, detail]
      })
    }

    window.addEventListener('eip6963:announceProvider', handleAnnounce)
    // Request providers
    window.dispatchEvent(new Event('eip6963:requestProvider'))

    setWalletState('DISCONNECTED')

    return () => {
      window.removeEventListener('eip6963:announceProvider', handleAnnounce)
    }
  }, [])

  const openChooser = useCallback(() => {
    setErrorMessage(null)
    setWalletState('CHOOSER_OPEN')
  }, [])

  const closeChooser = useCallback(() => {
    if (walletState === 'CHOOSER_OPEN') {
      setWalletState(account ? 'CONNECTED' : 'DISCONNECTED')
    }
  }, [walletState, account])

  const disconnectWallet = useCallback(() => {
    setSelectedWallet(null)
    setAccount(null)
    setChainId(null)
    setErrorMessage(null)
    setWalletState('DISCONNECTED')
  }, [])

  const switchToStudionet = useCallback(async (): Promise<boolean> => {
    if (!selectedWallet?.provider) return false

    const provider = selectedWallet.provider
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
      })
      setChainId(STUDIONET_CHAIN_ID)
      setWalletState('CONNECTED')
      return true
    } catch (switchError: any) {
      // Chain not added to wallet (4902)
      if (switchError.code === 4902 || switchError.data?.originalError?.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: STUDIONET_CHAIN_ID_HEX,
                chainName: STUDIONET_NAME,
                nativeCurrency: { name: 'GEN Token', symbol: 'GEN', decimals: 18 },
                rpcUrls: [STUDIONET_RPC_URL],
                blockExplorerUrls: [STUDIONET_EXPLORER_URL],
              },
            ],
          })
          // Retry switch once
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
          })
          setChainId(STUDIONET_CHAIN_ID)
          setWalletState('CONNECTED')
          return true
        } catch {
          setErrorMessage('Could not add Studionet to your wallet. Please check network permissions.')
          setWalletState('WRONG_CHAIN')
          return false
        }
      } else {
        setErrorMessage('Please switch your wallet network to GenLayer Studionet (Chain ID 61999).')
        setWalletState('WRONG_CHAIN')
        return false
      }
    }
  }, [selectedWallet])

  const connectWallet = useCallback(
    async (walletDetail: EIP6963ProviderDetail) => {
      setWalletState('CONNECTING')
      setErrorMessage(null)
      setSelectedWallet(walletDetail)

      const provider = walletDetail.provider
      try {
        const accounts: string[] = await provider.request({
          method: 'eth_requestAccounts',
        })

        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts authorized')
        }

        const rawChainId: string = await provider.request({
          method: 'eth_chainId',
        })
        const parsedChainId = parseInt(rawChainId, 16)

        setAccount(accounts[0])
        setChainId(parsedChainId)

        if (parsedChainId !== STUDIONET_CHAIN_ID) {
          setWalletState('WRONG_CHAIN')
          // Auto attempt switch
          try {
            await provider.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: STUDIONET_CHAIN_ID_HEX }],
            })
            setChainId(STUDIONET_CHAIN_ID)
            setWalletState('CONNECTED')
          } catch (err: any) {
            if (err.code === 4902) {
              try {
                await provider.request({
                  method: 'wallet_addEthereumChain',
                  params: [
                    {
                      chainId: STUDIONET_CHAIN_ID_HEX,
                      chainName: STUDIONET_NAME,
                      nativeCurrency: { name: 'GEN Token', symbol: 'GEN', decimals: 18 },
                      rpcUrls: [STUDIONET_RPC_URL],
                      blockExplorerUrls: [STUDIONET_EXPLORER_URL],
                    },
                  ],
                })
                setChainId(STUDIONET_CHAIN_ID)
                setWalletState('CONNECTED')
              } catch {
                setWalletState('WRONG_CHAIN')
              }
            } else {
              setWalletState('WRONG_CHAIN')
            }
          }
        } else {
          setWalletState('CONNECTED')
        }

        // Setup account and chain change listeners
        if (provider.on) {
          provider.on('accountsChanged', (newAccounts: string[]) => {
            if (!newAccounts || newAccounts.length === 0) {
              disconnectWallet()
            } else {
              setAccount(newAccounts[0])
            }
          })
          provider.on('chainChanged', (newChainIdHex: string) => {
            const nextChainId = parseInt(newChainIdHex, 16)
            setChainId(nextChainId)
            if (nextChainId !== STUDIONET_CHAIN_ID) {
              setWalletState('WRONG_CHAIN')
            } else {
              setWalletState('CONNECTED')
            }
          })
        }
      } catch (err: any) {
        setErrorMessage(err.message || 'Failed to connect wallet')
        setWalletState('ERROR')
      }
    },
    [disconnectWallet]
  )

  return (
    <WalletContext.Provider
      value={{
        walletState,
        account,
        chainId,
        selectedWallet,
        discoveredWallets,
        errorMessage,
        openChooser,
        closeChooser,
        connectWallet,
        disconnectWallet,
        switchToStudionet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export const useWallet = (): WalletContextValue => {
  const context = useContext(WalletContext)
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}
