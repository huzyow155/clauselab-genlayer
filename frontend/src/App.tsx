import React, { useState, useEffect, useCallback } from 'react'
import { Header } from './components/Header'
import { WalletModal } from './components/WalletModal'
import { TransactionOverlay } from './components/TransactionOverlay'
import { WorkflowIndicator } from './components/WorkflowIndicator'
import type { StepKey } from './components/WorkflowIndicator'
import { SpecSelector } from './components/SpecSelector'
import { SpecOverview } from './components/SpecOverview'
import { ScenariosTable } from './components/ScenariosTable'
import { LockingSection } from './components/LockingSection'
import { FactsSection } from './components/FactsSection'
import { AdjudicationSection } from './components/AdjudicationSection'
import { AdjudicationResultView } from './components/AdjudicationResultView'
import { HowItWorks } from './components/HowItWorks'
import {
  fetchSpec,
  fetchScenario,
  fetchSuiteReport,
  fetchFacts,
  fetchRuling,
  fetchLatestFactsId
} from './services/contractService'
import type { SpecRecord, ScenarioRecord, SuiteReport, FactsRecord, RulingRecord } from './types/contract'
import { DEFAULT_SPEC_ID, DEFAULT_FACTS_ID, CONTRACT_ADDRESS } from './config/chain'
import { Loader2, RefreshCw, ExternalLink } from 'lucide-react'

export const App: React.FC = () => {
  const [currentSpecId, setCurrentSpecId] = useState<string>(DEFAULT_SPEC_ID)
  const [spec, setSpec] = useState<SpecRecord | null>(null)
  const [scenarios, setScenarios] = useState<ScenarioRecord[]>([])
  const [suiteReport, setSuiteReport] = useState<SuiteReport | null>(null)
  const [facts, setFacts] = useState<FactsRecord | null>(null)
  const [ruling, setRuling] = useState<RulingRecord | null>(null)

  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [activeStep, setActiveStep] = useState<StepKey>('DRAFT')
  const [showHowItWorks, setShowHowItWorks] = useState<boolean>(false)

  // Load complete spec state from contract
  const loadSpecData = useCallback(async (specId: string) => {
    setIsLoading(true)
    try {
      const loadedSpec = await fetchSpec(specId)
      setSpec(loadedSpec)

      if (loadedSpec) {
        // Load all scenarios
        const scList: ScenarioRecord[] = []
        for (let i = 1; i <= loadedSpec.n_scenarios; i++) {
          const sc = await fetchScenario(specId, i)
          if (sc) scList.push(sc)
        }
        setScenarios(scList)

        // Load suite report
        const rep = await fetchSuiteReport(specId)
        setSuiteReport(rep)

        // Load facts
        const factsId = await fetchLatestFactsId(specId) || DEFAULT_FACTS_ID
        const loadedFacts = await fetchFacts(specId, factsId)
        setFacts(loadedFacts)

        // Load ruling if facts exist
        if (loadedFacts) {
          const loadedRuling = await fetchRuling(specId, loadedFacts.facts_id)
          setRuling(loadedRuling)

          // Determine appropriate active step
          if (loadedRuling) {
            setActiveStep('RESULT')
          } else if ((loadedFacts.by?.length || 0) >= 2) {
            setActiveStep('ADJUDICATE')
          } else if (loadedSpec.status === 'LOCKED') {
            setActiveStep('FACTS')
          } else {
            setActiveStep('DRAFT')
          }
        } else {
          setRuling(null)
          if (loadedSpec.status === 'LOCKED') {
            setActiveStep('FACTS')
          } else {
            setActiveStep('DRAFT')
          }
        }
      } else {
        setScenarios([])
        setSuiteReport(null)
        setFacts(null)
        setRuling(null)
      }
    } catch (err) {
      console.error('Error loading spec data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSpecData(currentSpecId)
  }, [currentSpecId, loadSpecData])

  const handleSelectSpecId = (newId: string) => {
    setCurrentSpecId(newId)
  }

  const isLocked = spec?.status === 'LOCKED'
  const hasConfirmedFacts = (facts?.by?.length || 0) >= 2
  const hasRuling = Boolean(ruling)

  return (
    <div className="min-h-screen flex flex-col bg-[#faf9f5] text-[#18181b]">
      {/* Top Header */}
      <Header onOpenHowItWorks={() => setShowHowItWorks(true)} />

      {/* Main Content Canvas */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Intro Section */}
        <section className="space-y-2 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 bg-white border border-[#e7e5e0] rounded-full text-xs font-mono text-[#52525b] shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>GenLayer Intelligent Contract &bull; Studionet</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[#18181b] leading-tight">
            Surface contract ambiguity before signing.
          </h1>

          <p className="text-sm sm:text-base text-[#52525b] max-w-2xl leading-relaxed">
            ClauseLab tests natural-language agreements through adversarial counterparty scenarios,
            validator consensus gates, and in-band canary calibration during dispute adjudication.
          </p>
        </section>

        {/* Spec Selector & Active Case Navigator */}
        <SpecSelector
          currentSpecId={currentSpecId}
          onSelectSpecId={handleSelectSpecId}
        />

        {/* Workflow Progress Indicator */}
        <WorkflowIndicator
          currentStep={activeStep}
          isLocked={Boolean(isLocked)}
          hasConfirmedFacts={hasConfirmedFacts}
          hasRuling={hasRuling}
          onStepClick={(step) => setActiveStep(step)}
        />

        {/* Loading State */}
        {isLoading && (
          <div className="py-16 text-center bg-white border border-[#e7e5e0] rounded-xl shadow-xs space-y-3">
            <Loader2 className="w-6 h-6 text-[#18181b] animate-spin mx-auto" />
            <div className="text-xs text-[#71717a] font-medium">
              Loading contract state from GenLayer Studionet...
            </div>
          </div>
        )}

        {/* Loaded Spec Workspace */}
        {!isLoading && spec && (
          <div className="space-y-6">
            {/* Primary Ruling View (if ruling exists and Result step selected) */}
            {ruling && (activeStep === 'RESULT' || activeStep === 'ADJUDICATE') && (
              <AdjudicationResultView ruling={ruling} />
            )}

            {/* Spec Overview (Clause, Parties, Signatures) */}
            <SpecOverview
              spec={spec}
              onSpecUpdated={(updated) => setSpec(updated)}
            />

            {/* Stage 1 & 2: Adversarial Scenarios Matrix & Pre-Signing Gate */}
            {(!isLocked || activeStep === 'DRAFT' || activeStep === 'LOCK') && (
              <>
                <ScenariosTable
                  spec={spec}
                  scenarios={scenarios}
                  suiteReport={suiteReport}
                  onScenarioAdded={(newSc) => setScenarios((prev) => [...prev, newSc])}
                  onScenarioUpdated={(upSc) =>
                    setScenarios((prev) => prev.map((s) => (s.n === upSc.n ? upSc : s)))
                  }
                  onSuiteReportUpdated={(rep) => setSuiteReport(rep)}
                  onSpecReload={() => loadSpecData(currentSpecId)}
                />

                <LockingSection
                  spec={spec}
                  suiteReport={suiteReport}
                  onSpecUpdated={(updated) => setSpec(updated)}
                />
              </>
            )}

            {/* Stage 3: Dispute Facts Stipulation & Confirmation */}
            {isLocked && (
              <FactsSection
                spec={spec}
                facts={facts}
                onFactsUpdated={(updated) => setFacts(updated)}
              />
            )}

            {/* Stage 4: Adjudication Trigger */}
            {isLocked && !ruling && (
              <AdjudicationSection
                spec={spec}
                facts={facts}
                ruling={ruling}
                onRulingReceived={(newRuling) => {
                  setRuling(newRuling)
                  setActiveStep('RESULT')
                }}
              />
            )}
          </div>
        )}

        {/* Spec Not Found Empty State */}
        {!isLoading && !spec && (
          <div className="py-16 text-center bg-white border border-[#e7e5e0] rounded-xl shadow-xs space-y-4 px-4">
            <h3 className="text-base font-semibold text-[#18181b]">Agreement Spec Not Found</h3>
            <p className="text-xs text-[#71717a] max-w-sm mx-auto">
              Spec <code className="font-mono text-[#18181b]">{currentSpecId}</code> does not exist on the deployed contract.
            </p>
            <button
              onClick={() => handleSelectSpecId(DEFAULT_SPEC_ID)}
              className="px-4 py-2 bg-[#18181b] text-white text-xs font-medium rounded-lg hover:bg-[#27272a] transition-all cursor-pointer inline-flex items-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Load Verified Live Spec ({DEFAULT_SPEC_ID})</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e7e5e0] bg-white py-8 mt-12 text-xs text-[#71717a]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#18181b]">ClauseLab</span>
            <span>&bull;</span>
            <span>Standalone GenLayer Intelligent Contract</span>
          </div>

          <div className="flex items-center gap-4 text-[11px]">
            <span>Network: Studionet (61999)</span>
            <span>&bull;</span>
            <a
              href={`https://explorer-studio.genlayer.com/address/${CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#18181b] hover:underline flex items-center gap-1"
            >
              Explorer <ExternalLink className="w-3 h-3" />
            </a>
            <span>&bull;</span>
            <span>MIT License</span>
          </div>
        </div>
      </footer>

      {/* Global Modals & Overlays */}
      <WalletModal />
      <TransactionOverlay />
      <HowItWorks
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />
    </div>
  )
}
