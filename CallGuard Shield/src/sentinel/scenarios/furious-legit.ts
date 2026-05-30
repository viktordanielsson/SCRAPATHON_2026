import { CallStatus, Speaker, Tactic } from '@/sentinel/protocol'
import type { Scenario } from './types'

/**
 * DEMO MOMENT #2 — a furious but legitimate customer.
 * Real anger, but NO attack: one low-confidence Urgency flag whose rationale
 * says it's tied to a billing grievance, not a credential request. Risk peaks
 * at 14 and DROPS. No alert. Proves the system discriminates weaponized
 * urgency from a genuinely annoyed caller.
 */
export const furiousLegit: Scenario = {
  id: 'furious-legit',
  label: 'Furious (Legit)',
  description: 'Angry customer with a real billing complaint — stays green, no alarm.',
  steps: [
    { atMs: 0, type: 'call.status', payload: { status: CallStatus.Live, callerLabel: '+1 (•••) •••-1190' } },

    { atMs: 500, type: 'transcript.turn', payload: { turnId: 't0', speaker: Speaker.Agent, text: 'Support, this is Dana — what can I do for you?', final: true, startMs: 0, endMs: 2000 } },

    { atMs: 2400, type: 'transcript.turn', payload: { turnId: 't1', speaker: Speaker.Caller, text: 'I am FURIOUS. You double-charged my card and I want it fixed right now.', final: true, startMs: 2200, endMs: 5400 } },
    { atMs: 2900, type: 'tactic.flag', payload: { flagId: 'f1', tactic: Tactic.Urgency, confidence: 0.34, rationale: 'Urgency tied to a legitimate billing grievance, not a request for credentials or access.', turnId: 't1' } },
    { atMs: 3100, type: 'risk.update', payload: { score: 14, delta: 14 } },

    { atMs: 5800, type: 'transcript.turn', payload: { turnId: 't2', speaker: Speaker.Agent, text: 'I completely understand — let me pull up your account and reverse that charge.', final: true, startMs: 5600, endMs: 9000 } },
    { atMs: 7000, type: 'risk.update', payload: { score: 9, delta: -5 } },

    { atMs: 9000, type: 'transcript.turn', payload: { turnId: 't3', speaker: Speaker.Caller, text: 'Okay. Thank you. Sorry for shouting.', final: true, startMs: 9000, endMs: 11000 } },
    { atMs: 9400, type: 'risk.update', payload: { score: 5, delta: -4 } },

    { atMs: 11000, type: 'session.summary', payload: { tacticCount: 1, totalFlags: 1, callerTurns: 2, peakRisk: 14, finalRisk: 5, durationMs: 11000 } },
    { atMs: 11200, type: 'call.status', payload: { status: CallStatus.Ended } },
  ],
}
