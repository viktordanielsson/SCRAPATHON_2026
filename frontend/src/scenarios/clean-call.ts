import { CallStatus, Speaker } from '@shared/protocol'
import type { Scenario } from './types'

/**
 * Baseline — an ordinary, benign support call. No tactics, risk barely moves.
 * Useful as a calm "nothing to see here" control before running an attack.
 */
export const cleanCall: Scenario = {
  id: 'clean-call',
  label: 'Clean Call',
  description: 'A normal support interaction — no social engineering.',
  steps: [
    { atMs: 0, type: 'call.status', payload: { status: CallStatus.Live, callerLabel: '+1 (•••) •••-3052' } },

    { atMs: 500, type: 'transcript.turn', payload: { turnId: 't0', speaker: Speaker.Agent, text: 'Thanks for calling — how can I help?', final: true, startMs: 0, endMs: 1800 } },
    { atMs: 2200, type: 'transcript.turn', payload: { turnId: 't1', speaker: Speaker.Caller, text: 'Hi, I just wanted to update the email address on my account.', final: true, startMs: 2000, endMs: 4800 } },
    { atMs: 2600, type: 'risk.update', payload: { score: 4, delta: 4 } },

    { atMs: 5200, type: 'transcript.turn', payload: { turnId: 't2', speaker: Speaker.Agent, text: 'Sure — I’ll send a verification link to your current email first.', final: true, startMs: 5000, endMs: 8200 } },
    { atMs: 8600, type: 'transcript.turn', payload: { turnId: 't3', speaker: Speaker.Caller, text: 'Perfect, got it. Thanks for your help!', final: true, startMs: 8400, endMs: 10200 } },
    { atMs: 9000, type: 'risk.update', payload: { score: 3, delta: -1 } },

    { atMs: 10400, type: 'session.summary', payload: { tacticCount: 0, totalFlags: 0, callerTurns: 2, peakRisk: 4, finalRisk: 3, durationMs: 10400 } },
    { atMs: 10600, type: 'call.status', payload: { status: CallStatus.Ended } },
  ],
}
