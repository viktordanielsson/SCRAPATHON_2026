import type { Scenario } from './types'
import { escalatingVish } from './escalating-vish'
import { furiousLegit } from './furious-legit'
import { cleanCall } from './clean-call'

export type { Scenario, ScriptStep } from './types'

export const SCENARIOS: Scenario[] = [escalatingVish, furiousLegit, cleanCall]

export const DEFAULT_SCENARIO_ID = escalatingVish.id

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((s) => s.id === id)
}
