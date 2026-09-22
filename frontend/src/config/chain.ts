import { chains } from 'genlayer-js'

export const CONTRACT_ADDRESS = (import.meta.env.VITE_CONTRACT_ADDRESS || '0xf227D68595178A2192888c85E3550fEff4b79406') as `0x${string}`
export const DEFAULT_SPEC_ID = '20f3293644c0'
export const DEFAULT_FACTS_ID = 'f1830b46947f'

export const STUDIONET_CHAIN_ID = 61999
export const STUDIONET_CHAIN_ID_HEX = '0xf22f'
export const STUDIONET_NAME = 'GenLayer Studionet'
export const STUDIONET_RPC_URL = 'https://studio.genlayer.com/api'
export const STUDIONET_EXPLORER_URL = 'https://explorer-studio.genlayer.com'

export const STUDIONET_CHAIN_CONFIG = chains ? chains.studionet : {
  id: STUDIONET_CHAIN_ID,
  name: STUDIONET_NAME,
  rpcUrls: { default: { http: [STUDIONET_RPC_URL] } },
  nativeCurrency: { name: 'GEN Token', symbol: 'GEN', decimals: 18 },
  blockExplorers: {
    default: {
      name: 'GenLayer Explorer',
      url: STUDIONET_EXPLORER_URL,
    },
  },
}
