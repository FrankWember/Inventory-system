import AsyncStorage from '@react-native-async-storage/async-storage'

// Local persistence for the session wizard (SessionScreen). The DB only sees
// the wizard's state at step boundaries (savePurchases / closeSession); every
// edit in between lives in component state and used to vanish on refresh or
// remount. The draft snapshots that in-between state so the wizard can resume
// exactly where the user left off, including sessions for past dates.

const DRAFT_KEY = 'SESSION_WIZARD_DRAFT_V1'

export type WizardStep = 'purchases' | 'expenses' | 'inventory' | 'summary'

const WIZARD_STEPS: WizardStep[] = ['purchases', 'expenses', 'inventory', 'summary']

export interface SessionWizardDraft {
  // null while the session row hasn't been created yet (user still entering
  // deliveries on the purchases step).
  sessionId: string | null
  sessionDate: string
  step: WizardStep
  purchases: Record<string, number>
  closingCounts: Record<string, number>
  updatedAt: number
}

export async function saveSessionDraft(draft: SessionWizardDraft): Promise<void> {
  try {
    await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  } catch (error) {
    console.error('Failed to save session draft:', error)
  }
}

export async function loadSessionDraft(): Promise<SessionWizardDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(DRAFT_KEY)
    if (!raw) return null
    const draft = JSON.parse(raw) as SessionWizardDraft
    // Minimal shape check so a corrupt/old payload can't wedge the wizard.
    if (!draft || typeof draft.sessionDate !== 'string' || !WIZARD_STEPS.includes(draft.step)) return null
    return {
      ...draft,
      purchases: draft.purchases ?? {},
      closingCounts: draft.closingCounts ?? {},
    }
  } catch (error) {
    console.error('Failed to load session draft:', error)
    return null
  }
}

export async function clearSessionDraft(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DRAFT_KEY)
  } catch (error) {
    console.error('Failed to clear session draft:', error)
  }
}
