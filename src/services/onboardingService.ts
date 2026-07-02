import { supabase } from '../lib/supabase'
import { getCurrentUser } from '../lib/authClient'
import { setOnboardingCompleted, setBarInfo } from '../lib/storage'
import { DrinkTemplate } from '../data/cameroonianDrinks'
import { DrinkConfig } from '../contexts/OnboardingContext'

export interface BulkInsertResult {
  success: boolean
  error?: string
  insertedCount?: number
}

/**
 * Validates a drink configuration
 */
export function validateDrinkConfig(config: DrinkConfig): { valid: boolean; error?: string } {
  if (!config.price || config.price <= 0) {
    return { valid: false, error: 'Price must be greater than 0' }
  }

  if (!config.cassierCost || config.cassierCost <= 0) {
    return { valid: false, error: 'Cassier cost must be greater than 0' }
  }

  if (!config.cassierQuantity || config.cassierQuantity <= 0) {
    return { valid: false, error: 'Cassier quantity must be greater than 0' }
  }

  if (config.initialStock !== undefined && config.initialStock < 0) {
    return { valid: false, error: 'Initial stock cannot be negative' }
  }

  if (config.minStock !== undefined && config.minStock < 0) {
    return { valid: false, error: 'Min stock cannot be negative' }
  }

  return { valid: true }
}

/**
 * Calculate total inventory value
 */
export function calculateStockValue(
  drinks: DrinkTemplate[],
  configs: Map<string, DrinkConfig>
): number {
  let total = 0
  drinks.forEach(drink => {
    const config = configs.get(drink.name)
    if (config && config.initialStock) {
      const costPerUnit = config.cassierCost / config.cassierQuantity
      total += config.initialStock * costPerUnit
    }
  })
  return Math.round(total)
}

/**
 * Bulk insert drinks into the database
 */
export async function bulkInsertDrinks(
  drinks: DrinkTemplate[],
  configs: Map<string, DrinkConfig>
): Promise<BulkInsertResult> {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Validate all configs
    for (const drink of drinks) {
      const config = configs.get(drink.name)
      if (!config) {
        return { success: false, error: `Configuration missing for ${drink.name}` }
      }

      const validation = validateDrinkConfig(config)
      if (!validation.valid) {
        return { success: false, error: `${drink.name}: ${validation.error}` }
      }
    }

    // Prepare drinks for insertion
    const drinksToInsert = drinks.map(drink => {
      const config = configs.get(drink.name)!
      const costPerUnit = Math.round(config.cassierCost / config.cassierQuantity)

      return {
        user_id: user.id,
        name: drink.name,
        category: drink.category,
        price: config.price,
        cost: costPerUnit,
        stock: config.initialStock || 0,
        min_stock: config.minStock || drink.defaultRackSize,
        rack_size: config.cassierQuantity,
        cassier_quantity: config.cassierQuantity,
        cassier_cost: config.cassierCost,
        supplier: config.supplier || '',
        notes: '',
        active: true,
      }
    })

    // Bulk insert
    const { error } = await supabase
      .from('drinks')
      .insert(drinksToInsert)

    if (error) {
      console.error('Error inserting drinks:', error)
      return { success: false, error: error.message }
    }

    return {
      success: true,
      insertedCount: drinks.length
    }
  } catch (error: any) {
    console.error('Unexpected error during bulk insert:', error)
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    }
  }
}

/**
 * Update bar settings in the database
 */
export async function updateBarSettings(barName: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Update settings table
    const { error } = await supabase
      .from('settings')
      .update({ bar_name: barName })
      .eq('user_id', user.id)

    if (error) {
      console.error('Error updating bar settings:', error)
      return { success: false, error: error.message }
    }

    // Also update AsyncStorage for consistency
    await setBarInfo({ name: barName })

    return { success: true }
  } catch (error: any) {
    console.error('Unexpected error updating bar settings:', error)
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

/**
 * Mark onboarding as complete in the database
 */
export async function markOnboardingComplete(): Promise<{ success: boolean; error?: string }> {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Update settings table to mark onboarding as complete
    const { error } = await supabase
      .from('settings')
      .update({ onboarding_completed: true })
      .eq('user_id', user.id)

    if (error) {
      console.error('Error marking onboarding complete:', error)
      return { success: false, error: error.message }
    }

    // Also update AsyncStorage for caching
    await setOnboardingCompleted()

    return { success: true }
  } catch (error: any) {
    console.error('Unexpected error marking onboarding complete:', error)
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}

/**
 * Check if user has completed onboarding (from database)
 */
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    // Get current user
    const user = await getCurrentUser()
    if (!user) {
      return false
    }

    // Query settings table for onboarding status
    const { data, error } = await supabase
      .from('settings')
      .select('onboarding_completed')
      .eq('user_id', user.id)
      .single()

    if (error) {
      console.error('Error checking onboarding status:', error)
      return false
    }

    return data?.onboarding_completed ?? false
  } catch (error: any) {
    console.error('Unexpected error checking onboarding status:', error)
    return false
  }
}

/**
 * Complete the onboarding process
 * - Updates bar name
 * - Inserts all drinks
 * - Marks onboarding as complete in database and local storage
 */
export async function completeOnboarding(
  barName: string,
  drinks: DrinkTemplate[],
  configs: Map<string, DrinkConfig>
): Promise<{ success: boolean; error?: string }> {
  try {
    // Step 1: Update bar name
    const barResult = await updateBarSettings(barName)
    if (!barResult.success) {
      return { success: false, error: `Failed to update bar name: ${barResult.error}` }
    }

    // Step 2: Insert drinks
    const drinksResult = await bulkInsertDrinks(drinks, configs)
    if (!drinksResult.success) {
      return { success: false, error: `Failed to add drinks: ${drinksResult.error}` }
    }

    // Step 3: Mark onboarding complete (both database and AsyncStorage)
    const onboardingResult = await markOnboardingComplete()
    if (!onboardingResult.success) {
      return { success: false, error: `Failed to mark onboarding complete: ${onboardingResult.error}` }
    }

    return {
      success: true,
    }
  } catch (error: any) {
    console.error('Error completing onboarding:', error)
    return { success: false, error: error.message || 'An unexpected error occurred' }
  }
}
