import React, { createContext, useContext, useState, ReactNode } from 'react'
import { DrinkTemplate } from '../data/cameroonianDrinks'

export interface DrinkConfig {
  price: number
  cassierCost: number
  cassierQuantity: number
  supplier?: string
  initialStock?: number
  minStock?: number
}

interface OnboardingState {
  barName: string
  selectedDrinks: DrinkTemplate[]
  drinkConfigs: Map<string, DrinkConfig>
  currentStep: number
  totalStockValue: number
}

interface OnboardingContextType {
  state: OnboardingState
  setBarName: (name: string) => void
  selectDrinks: (drinks: DrinkTemplate[]) => void
  updateDrinkConfig: (drinkName: string, config: DrinkConfig) => void
  removeDrink: (drinkName: string) => void
  calculateTotalStockValue: () => number
  nextStep: () => void
  previousStep: () => void
  isAllDrinksConfigured: () => boolean
  reset: () => void
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined)

const initialState: OnboardingState = {
  barName: '',
  selectedDrinks: [],
  drinkConfigs: new Map(),
  currentStep: 0,
  totalStockValue: 0,
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(initialState)

  const setBarName = (name: string) => {
    setState(prev => ({ ...prev, barName: name }))
  }

  const selectDrinks = (drinks: DrinkTemplate[]) => {
    setState(prev => ({ ...prev, selectedDrinks: drinks }))
  }

  const updateDrinkConfig = (drinkName: string, config: DrinkConfig) => {
    setState(prev => {
      const newConfigs = new Map(prev.drinkConfigs)
      newConfigs.set(drinkName, config)
      return { ...prev, drinkConfigs: newConfigs }
    })
  }

  const removeDrink = (drinkName: string) => {
    setState(prev => {
      const newDrinks = prev.selectedDrinks.filter(d => d.name !== drinkName)
      const newConfigs = new Map(prev.drinkConfigs)
      newConfigs.delete(drinkName)
      return {
        ...prev,
        selectedDrinks: newDrinks,
        drinkConfigs: newConfigs,
      }
    })
  }

  const calculateTotalStockValue = (): number => {
    let total = 0
    state.selectedDrinks.forEach(drink => {
      const config = state.drinkConfigs.get(drink.name)
      if (config) {
        const stockValue = (config.initialStock || 0) * (config.cassierCost / config.cassierQuantity)
        total += stockValue
      }
    })
    return Math.round(total)
  }

  const nextStep = () => {
    setState(prev => ({ ...prev, currentStep: prev.currentStep + 1 }))
  }

  const previousStep = () => {
    setState(prev => ({ ...prev, currentStep: Math.max(0, prev.currentStep - 1) }))
  }

  const isAllDrinksConfigured = (): boolean => {
    if (state.selectedDrinks.length === 0) return false

    for (const drink of state.selectedDrinks) {
      const config = state.drinkConfigs.get(drink.name)
      if (!config || !config.price || !config.cassierCost || !config.cassierQuantity) {
        return false
      }
    }
    return true
  }

  const reset = () => {
    setState(initialState)
  }

  return (
    <OnboardingContext.Provider
      value={{
        state,
        setBarName,
        selectDrinks,
        updateDrinkConfig,
        removeDrink,
        calculateTotalStockValue,
        nextStep,
        previousStep,
        isAllDrinksConfigured,
        reset,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  )
}

export function useOnboarding() {
  const context = useContext(OnboardingContext)
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider')
  }
  return context
}
