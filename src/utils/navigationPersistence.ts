import AsyncStorage from '@react-native-async-storage/async-storage'
import { NavigationState, PartialState } from '@react-navigation/native'

const PERSISTENCE_KEY = 'NAVIGATION_STATE_V1'

export async function saveNavigationState(state: NavigationState | PartialState<NavigationState> | undefined) {
  try {
    if (state) {
      await AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state))
    }
  } catch (error) {
    console.error('Failed to save navigation state:', error)
  }
}

export async function loadNavigationState(): Promise<NavigationState | undefined> {
  try {
    const savedStateString = await AsyncStorage.getItem(PERSISTENCE_KEY)
    return savedStateString ? JSON.parse(savedStateString) : undefined
  } catch (error) {
    console.error('Failed to load navigation state:', error)
    return undefined
  }
}

export async function clearNavigationState() {
  try {
    await AsyncStorage.removeItem(PERSISTENCE_KEY)
  } catch (error) {
    console.error('Failed to clear navigation state:', error)
  }
}
