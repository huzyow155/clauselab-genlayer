import { createClient } from 'genlayer-js'
import { CONTRACT_ADDRESS, STUDIONET_CHAIN_CONFIG } from '../config/chain'
import type {
  SpecRecord,
  ScenarioRecord,
  SuiteReport,
  FactsRecord,
  RulingRecord
} from '../types/contract'

// Shared public read client
const publicClient = createClient({
  chain: STUDIONET_CHAIN_CONFIG,
})

export function getWriteClient(account: string, provider: any) {
  return createClient({
    chain: STUDIONET_CHAIN_CONFIG,
    account: account as `0x${string}`,
    provider,
  })
}

// ---------------------------------------------------------------------------
// READ METHODS (Authoritative contract queries)
// ---------------------------------------------------------------------------

export async function fetchSpec(specId: string): Promise<SpecRecord | null> {
  try {
    const raw: any = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_spec',
      args: [specId],
    })
    if (!raw || raw === '{}') return null
    return typeof raw === 'string' ? JSON.parse(raw) : (raw as SpecRecord)
  } catch (err) {
    console.error('fetchSpec error:', err)
    return null
  }
}

export async function fetchScenario(specId: string, n: number): Promise<ScenarioRecord | null> {
  try {
    const raw: any = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_scenario',
      args: [specId, n],
    })
    if (!raw || raw === '{}') return null
    return typeof raw === 'string' ? JSON.parse(raw) : (raw as ScenarioRecord)
  } catch (err) {
    console.error(`fetchScenario ${n} error:`, err)
    return null
  }
}

export async function fetchSuiteReport(specId: string): Promise<SuiteReport | null> {
  try {
    const raw: any = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'suite_report',
      args: [specId],
    })
    if (!raw || raw === '{}') return null
    return typeof raw === 'string' ? JSON.parse(raw) : (raw as SuiteReport)
  } catch (err) {
    console.error('fetchSuiteReport error:', err)
    return null
  }
}

export async function fetchFacts(specId: string, factsId: string): Promise<FactsRecord | null> {
  try {
    const raw: any = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_facts',
      args: [specId, factsId],
    })
    if (!raw || raw === '{}') return null
    return typeof raw === 'string' ? JSON.parse(raw) : (raw as FactsRecord)
  } catch (err) {
    console.error('fetchFacts error:', err)
    return null
  }
}

export async function fetchLatestFactsId(specId: string): Promise<string | null> {
  try {
    const raw: any = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_latest_facts_id',
      args: [specId],
    })
    if (!raw || raw === '""' || raw === '') return null
    return typeof raw === 'string' ? raw.replace(/^"|"$/g, '') : (String(raw) || null)
  } catch {
    return null
  }
}

export async function fetchRuling(specId: string, factsId: string): Promise<RulingRecord | null> {
  try {
    const raw: any = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_ruling',
      args: [specId, factsId],
    })
    if (!raw || raw === '{}') return null
    return typeof raw === 'string' ? JSON.parse(raw) : (raw as RulingRecord)
  } catch (err) {
    console.error('fetchRuling error:', err)
    return null
  }
}

export async function fetchIsLocked(specId: string): Promise<boolean> {
  try {
    const raw = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'is_locked',
      args: [specId],
    })
    return Boolean(raw)
  } catch {
    return false
  }
}

export async function fetchSpecHash(specId: string): Promise<string> {
  try {
    const raw = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      functionName: 'get_spec_hash',
      args: [specId],
    })
    return typeof raw === 'string' ? raw.replace(/^"|"$/g, '') : ''
  } catch {
    return ''
  }
}

// ---------------------------------------------------------------------------
// WRITE METHODS (Triggers wallet signing + GenLayer consensus)
// ---------------------------------------------------------------------------

export async function submitCreateSpec(
  writeClient: any,
  title: string,
  clause: string,
  labelsCsv: string
): Promise<string> {
  return await writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'create_spec',
    args: [title, clause, labelsCsv],
  })
}

export async function submitInvite(
  writeClient: any,
  specId: string,
  partyAddress: string
): Promise<string> {
  return await writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'invite',
    args: [specId, partyAddress],
  })
}

export async function submitAddScenario(
  writeClient: any,
  specId: string,
  text: string,
  expectedLabel: string
): Promise<string> {
  return await writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'add_scenario',
    args: [specId, text, expectedLabel],
  })
}

export async function submitRunScenario(
  writeClient: any,
  specId: string,
  n: number
): Promise<string> {
  return await writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'run_scenario',
    args: [specId, n],
  })
}

export async function submitAmendClause(
  writeClient: any,
  specId: string,
  newClause: string
): Promise<string> {
  return await writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'amend',
    args: [specId, newClause],
  })
}

export async function submitSign(
  writeClient: any,
  specId: string
): Promise<string> {
  return await writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'sign',
    args: [specId],
  })
}

export async function submitLock(
  writeClient: any,
  specId: string
): Promise<string> {
  return await writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'lock',
    args: [specId],
  })
}

export async function submitStipulateFacts(
  writeClient: any,
  specId: string,
  text: string
): Promise<string> {
  return await writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'stipulate_facts',
    args: [specId, text],
  })
}

export async function submitConfirmFacts(
  writeClient: any,
  specId: string,
  factsId: string
): Promise<string> {
  return await writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'confirm_facts',
    args: [specId, factsId],
  })
}

export async function submitAdjudicate(
  writeClient: any,
  specId: string,
  factsId: string
): Promise<string> {
  return await writeClient.writeContract({
    address: CONTRACT_ADDRESS,
    functionName: 'adjudicate',
    args: [specId, factsId],
  })
}
