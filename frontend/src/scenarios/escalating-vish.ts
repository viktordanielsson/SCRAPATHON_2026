import { AlertLevel, CallStatus, Speaker, Tactic } from '@shared/protocol'
import type { Scenario } from './types'

/**
 * DEMO MOMENT #1 — an escalating vishing attack.
 * Badges cascade on, the gauge climbs 0 → 84, the CRITICAL banner slams in.
 * Note t3 streams interim updates before finalizing — this exercises the
 * ghost-text → final transcript path (the riskiest untested UI path).
 */
export const escalatingVish: Scenario = {
  id: 'escalating-vish',
  label: 'Escalating Vish',
  description: 'Impersonator runs false authority → urgency + fear → OTP pretext.',
  steps: [
    { atMs: 0, type: 'call.status', payload: { status: CallStatus.Live, callerLabel: '+1 (•••) •••-4827' } },

    { atMs: 600, type: 'transcript.turn', payload: { turnId: 't0', speaker: Speaker.Agent, text: 'Thanks for calling support — how can I help today?', final: true, startMs: 0, endMs: 2200 } },

    { atMs: 2600, type: 'transcript.turn', payload: { turnId: 't1', speaker: Speaker.Caller, text: 'Hi, this is Mark from the fraud department.', final: true, startMs: 2400, endMs: 4600 } },
    { atMs: 3000, type: 'tactic.flag', payload: { flagId: 'f1', tactic: Tactic.FalseAuthority, confidence: 0.71, rationale: 'Claims to be from an internal fraud department.', turnId: 't1', span: [13, 47] } },
    { atMs: 3200, type: 'risk.update', payload: { score: 22, delta: 22 } },

    { atMs: 5200, type: 'transcript.turn', payload: { turnId: 't2', speaker: Speaker.Caller, text: 'Your account will be locked in 5 minutes unless you verify it now.', final: true, startMs: 4800, endMs: 8000 } },
    { atMs: 5600, type: 'tactic.flag', payload: { flagId: 'f2', tactic: Tactic.Urgency, confidence: 0.88, rationale: 'Manufactured 5-minute deadline to force action.', turnId: 't2' } },
    { atMs: 5800, type: 'tactic.flag', payload: { flagId: 'f3', tactic: Tactic.Fear, confidence: 0.79, rationale: 'Threatens account lockout to induce compliance.', turnId: 't2' } },
    { atMs: 6000, type: 'risk.update', payload: { score: 58, delta: 36, contributors: [{ tactic: Tactic.Urgency, weight: 22 }, { tactic: Tactic.Fear, weight: 14 }] } },

    // t3 streams in (interim → final) so the ghost-text path is exercised live.
    { atMs: 8200, type: 'transcript.turn', payload: { turnId: 't3', speaker: Speaker.Caller, text: 'Just read me the', final: false } },
    { atMs: 8700, type: 'transcript.turn', payload: { turnId: 't3', speaker: Speaker.Caller, text: 'Just read me the code we just', final: false } },
    { atMs: 9300, type: 'transcript.turn', payload: { turnId: 't3', speaker: Speaker.Caller, text: 'Just read me the code we just texted you, or you’ll be liable for the charges.', final: true, startMs: 8000, endMs: 11400 } },
    { atMs: 9700, type: 'tactic.flag', payload: { flagId: 'f4', tactic: Tactic.Pretexting, confidence: 0.84, rationale: 'Solicits a one-time passcode under a false premise.', turnId: 't3' } },
    { atMs: 9900, type: 'risk.update', payload: { score: 84, delta: 26 } },
    { atMs: 10000, type: 'alert', payload: { alertId: 'a1', level: AlertLevel.Critical, message: 'OTP solicitation via false authority + manufactured urgency.', riskAtFire: 84, relatedFlagIds: ['f1', 'f2', 'f4'] } },

    { atMs: 11800, type: 'session.summary', payload: { tacticCount: 4, totalFlags: 4, callerTurns: 3, peakRisk: 84, finalRisk: 84, durationMs: 11800 } },
    { atMs: 12000, type: 'call.status', payload: { status: CallStatus.Ended } },
  ],
}
