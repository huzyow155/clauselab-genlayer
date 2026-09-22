export interface SpecRecord {
  schema_version: string
  spec_id: string
  author: string
  title: string
  clause: string
  labels: string[]
  version: number
  status: 'DRAFT' | 'LOCKED'
  parties: string[]
  signed: string[]
  n_scenarios: number
  spec_hash: string
}

export interface ScenarioRecord {
  schema_version: string
  spec_id: string
  n: number
  text: string
  expected: string
  proposer: string
  ran_version: number
  label: string
  matches: boolean
}

export interface SuiteReport {
  schema_version?: string
  spec_id?: string
  version?: number
  total_scenarios: number
  red_scenarios: number[]
  stale_scenarios: number[]
  green_scenarios: number[]
  label_distribution: Record<string, number>
  ready_to_lock: boolean
  lock_problems: string[]
}

export interface FactsRecord {
  schema_version?: string
  spec_id: string
  facts_id: string
  text: string
  by: string[]
}

export interface RulingRecord {
  schema_version?: string
  spec_id: string
  facts_id: string
  verdict: string
  canary_pass: boolean
  spec_hash: string
}

export type TransactionPhase =
  | 'IDLE'
  | 'WAITING_FOR_WALLET'
  | 'SUBMITTED'
  | 'WAITING_FOR_FINALITY'
  | 'VERIFYING_EXECUTION'
  | 'VERIFYING_READBACK'
  | 'SUCCESS'
  | 'FAILED'
  | 'RECONCILIATION_REQUIRED'

export interface PendingTransaction {
  id: string
  operation: string
  txHash: string
  specId?: string
  factsId?: string
  timestamp: number
  expectedPostcondition?: string
}
