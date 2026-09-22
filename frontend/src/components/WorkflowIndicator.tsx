import React from 'react'
import { Check } from 'lucide-react'

export type StepKey = 'DRAFT' | 'LOCK' | 'FACTS' | 'ADJUDICATE' | 'RESULT'

interface WorkflowIndicatorProps {
  currentStep: StepKey
  isLocked: boolean
  hasConfirmedFacts: boolean
  hasRuling: boolean
  onStepClick?: (step: StepKey) => void
}

export const WorkflowIndicator: React.FC<WorkflowIndicatorProps> = ({
  currentStep,
  isLocked,
  hasConfirmedFacts,
  hasRuling,
  onStepClick,
}) => {
  const steps: { key: StepKey; label: string; number: number; isDone: boolean; isAvailable: boolean }[] = [
    {
      key: 'DRAFT',
      label: '1. Draft & Scenarios',
      number: 1,
      isDone: isLocked,
      isAvailable: true,
    },
    {
      key: 'LOCK',
      label: '2. Sign & Lock',
      number: 2,
      isDone: isLocked,
      isAvailable: true,
    },
    {
      key: 'FACTS',
      label: '3. Stipulate Facts',
      number: 3,
      isDone: hasConfirmedFacts,
      isAvailable: isLocked,
    },
    {
      key: 'ADJUDICATE',
      label: '4. Adjudicate',
      number: 4,
      isDone: hasRuling,
      isAvailable: isLocked && hasConfirmedFacts,
    },
    {
      key: 'RESULT',
      label: '5. Consensus Result',
      number: 5,
      isDone: hasRuling,
      isAvailable: hasRuling,
    },
  ]

  return (
    <div className="w-full bg-white border border-[#e7e5e0] rounded-xl p-3 sm:p-4 shadow-xs">
      <div className="flex items-center justify-between overflow-x-auto gap-2 py-1 scrollbar-none">
        {steps.map((s, idx) => {
          const isCurrent = currentStep === s.key
          const isDone = s.isDone && !isCurrent

          let badgeClasses = 'bg-[#f4f4f5] text-[#71717a] border-[#e4e4e7]'
          let textClasses = 'text-[#71717a]'

          if (isCurrent) {
            badgeClasses = 'bg-[#18181b] text-white border-[#18181b] ring-2 ring-[#18181b]/10'
            textClasses = 'text-[#18181b] font-semibold'
          } else if (isDone) {
            badgeClasses = 'bg-emerald-50 text-emerald-700 border-emerald-200'
            textClasses = 'text-[#27272a] font-medium'
          } else if (!s.isAvailable) {
            textClasses = 'text-[#a1a1aa] opacity-60'
          }

          return (
            <React.Fragment key={s.key}>
              <button
                type="button"
                onClick={() => s.isAvailable && onStepClick?.(s.key)}
                disabled={!s.isAvailable}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg transition-all text-xs whitespace-nowrap text-left ${
                  s.isAvailable ? 'cursor-pointer hover:bg-[#faf9f5]' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full border flex items-center justify-center text-[11px] font-mono shrink-0 transition-colors ${badgeClasses}`}
                >
                  {isDone ? <Check className="w-3 h-3 stroke-[2.5]" /> : s.number}
                </span>
                <span className={textClasses}>{s.label}</span>
              </button>

              {idx < steps.length - 1 && (
                <div className="hidden sm:block w-4 h-[1px] bg-[#e7e5e0] shrink-0" />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </div>
  )
}
