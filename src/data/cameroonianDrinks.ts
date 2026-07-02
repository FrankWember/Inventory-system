import { Category } from '../types'

export interface DrinkTemplate {
  name: string
  category: Category
  defaultRackSize: number
  popular?: boolean
}

export const CAMEROONIAN_DRINKS: DrinkTemplate[] = [
  // Bières (Beers)
  { name: '33 EXPORT', category: 'Bière', defaultRackSize: 12, popular: true },
  { name: 'MUTZIG', category: 'Bière', defaultRackSize: 12, popular: true },
  { name: 'CASTEL', category: 'Bière', defaultRackSize: 12, popular: true },
  { name: 'BEAUFORT', category: 'Bière', defaultRackSize: 12, popular: true },
  { name: 'KADJI', category: 'Bière', defaultRackSize: 12, popular: true },
  { name: 'ISENBECK', category: 'Bière', defaultRackSize: 12, popular: true },
  { name: 'AMSTEL', category: 'Bière', defaultRackSize: 12, popular: true },
  { name: 'HEINEKEN', category: 'Bière', defaultRackSize: 12, popular: true },
  { name: 'GUINNESS', category: 'Bière', defaultRackSize: 12, popular: true },
  { name: 'DESPERADOS', category: 'Bière', defaultRackSize: 12, popular: true },
  { name: 'TUBORG', category: 'Bière', defaultRackSize: 12 },
  { name: 'PILS', category: 'Bière', defaultRackSize: 12 },
  { name: 'MANYAN', category: 'Bière', defaultRackSize: 12 },
  { name: 'TOP GRENADINE', category: 'Bière', defaultRackSize: 12 },
  { name: '33 EXPORT GRANDE (65cl)', category: 'Bière', defaultRackSize: 12 },
  { name: 'MUTZIG GRANDE (65cl)', category: 'Bière', defaultRackSize: 12 },
  { name: 'CASTEL GRANDE (65cl)', category: 'Bière', defaultRackSize: 12 },

  // Sodas
  { name: 'COCA COLA 33cl', category: 'Soda', defaultRackSize: 24, popular: true },
  { name: 'COCA COLA 50cl', category: 'Soda', defaultRackSize: 12, popular: true },
  { name: 'COCA COLA 1L', category: 'Soda', defaultRackSize: 12 },
  { name: 'COCA COLA 1.5L', category: 'Soda', defaultRackSize: 12 },
  { name: 'COCA COLA 2L', category: 'Soda', defaultRackSize: 6 },
  { name: 'FANTA ORANGE 33cl', category: 'Soda', defaultRackSize: 24, popular: true },
  { name: 'FANTA ORANGE 50cl', category: 'Soda', defaultRackSize: 12, popular: true },
  { name: 'FANTA ORANGE 1L', category: 'Soda', defaultRackSize: 12 },
  { name: 'FANTA CITRON 33cl', category: 'Soda', defaultRackSize: 24 },
  { name: 'FANTA CITRON 50cl', category: 'Soda', defaultRackSize: 12 },
  { name: 'SPRITE 33cl', category: 'Soda', defaultRackSize: 24, popular: true },
  { name: 'SPRITE 50cl', category: 'Soda', defaultRackSize: 12, popular: true },
  { name: 'SPRITE 1L', category: 'Soda', defaultRackSize: 12 },
  { name: 'TONIC 33cl', category: 'Soda', defaultRackSize: 24 },
  { name: 'TONIC 50cl', category: 'Soda', defaultRackSize: 12 },
  { name: 'DJINO 33cl', category: 'Soda', defaultRackSize: 24, popular: true },
  { name: 'DJINO 50cl', category: 'Soda', defaultRackSize: 12 },
  { name: 'YOUKI COCKTAIL 50cl', category: 'Soda', defaultRackSize: 12 },
  { name: 'TOP ANANAS 50cl', category: 'Soda', defaultRackSize: 12 },
  { name: 'TOP ORANGE 50cl', category: 'Soda', defaultRackSize: 12 },
  { name: 'TOP GRENADINE 50cl', category: 'Soda', defaultRackSize: 12 },
  { name: 'TANGUI ORANGE 50cl', category: 'Soda', defaultRackSize: 12 },
  { name: 'TANGUI ANANAS 50cl', category: 'Soda', defaultRackSize: 12 },
  { name: 'TAMPICO 1L', category: 'Soda', defaultRackSize: 12 },
  { name: 'PULPY ORANGE 33cl', category: 'Soda', defaultRackSize: 24 },

  // Jus (Juices)
  { name: 'JUS DE BISSAP', category: 'Jus', defaultRackSize: 12, popular: true },
  { name: 'JUS DE GINGEMBRE', category: 'Jus', defaultRackSize: 12, popular: true },
  { name: 'JUS D\'ANANAS', category: 'Jus', defaultRackSize: 12, popular: true },
  { name: 'JUS DE MANGUE', category: 'Jus', defaultRackSize: 12 },
  { name: 'JUS DE PAMPLEMOUSSE', category: 'Jus', defaultRackSize: 12 },
  { name: 'JUS DE CITRON', category: 'Jus', defaultRackSize: 12 },
  { name: 'JUS DE FRUIT DE LA PASSION', category: 'Jus', defaultRackSize: 12 },
  { name: 'JUS DE PAPAYE', category: 'Jus', defaultRackSize: 12 },
  { name: 'JUS DE TAMARIN', category: 'Jus', defaultRackSize: 12 },
  { name: 'TOP PAMPLEMOUSSE 1L', category: 'Jus', defaultRackSize: 12 },
  { name: 'TOP ANANAS 1L', category: 'Jus', defaultRackSize: 12 },
  { name: 'TOP ORANGE 1L', category: 'Jus', defaultRackSize: 12 },
  { name: 'MINUTE MAID ORANGE 1L', category: 'Jus', defaultRackSize: 12 },
  { name: 'MINUTE MAID POMME 1L', category: 'Jus', defaultRackSize: 12 },
  { name: 'MINUTE MAID ANANAS 1L', category: 'Jus', defaultRackSize: 12 },

  // Eau (Water)
  { name: 'EAU MINERAL 33cl', category: 'Eau', defaultRackSize: 24, popular: true },
  { name: 'EAU MINERAL 50cl', category: 'Eau', defaultRackSize: 12, popular: true },
  { name: 'EAU MINERAL 1.5L', category: 'Eau', defaultRackSize: 6, popular: true },
  { name: 'SUPERMONT 33cl', category: 'Eau', defaultRackSize: 24 },
  { name: 'SUPERMONT 50cl', category: 'Eau', defaultRackSize: 12 },
  { name: 'SUPERMONT 1.5L', category: 'Eau', defaultRackSize: 6 },
  { name: 'TANGUI 33cl', category: 'Eau', defaultRackSize: 24 },
  { name: 'TANGUI 50cl', category: 'Eau', defaultRackSize: 12 },
  { name: 'TANGUI 1.5L', category: 'Eau', defaultRackSize: 6 },

  // Vins (Wines)
  { name: 'VIN ROUGE', category: 'Vin', defaultRackSize: 12 },
  { name: 'VIN BLANC', category: 'Vin', defaultRackSize: 12 },
  { name: 'VIN ROSÉ', category: 'Vin', defaultRackSize: 12 },
  { name: 'CHAMPAGNE', category: 'Vin', defaultRackSize: 6 },
  { name: 'VIN DE PALME', category: 'Vin', defaultRackSize: 12 },
  { name: 'VIN DE RAPHIA', category: 'Vin', defaultRackSize: 12 },

  // Autres (Other)
  { name: 'WHISKY', category: 'Autre', defaultRackSize: 12 },
  { name: 'VODKA', category: 'Autre', defaultRackSize: 12 },
  { name: 'GIN', category: 'Autre', defaultRackSize: 12 },
  { name: 'RHUM', category: 'Autre', defaultRackSize: 12 },
  { name: 'BRANDY', category: 'Autre', defaultRackSize: 12 },
  { name: 'LIQUEUR', category: 'Autre', defaultRackSize: 12 },
  { name: 'ENERGY DRINK', category: 'Autre', defaultRackSize: 24 },
  { name: 'REDBULL', category: 'Autre', defaultRackSize: 24 },
  { name: 'MONSTER', category: 'Autre', defaultRackSize: 24 },
]

// Group drinks by category for easier display
export const getDrinksByCategory = (): Record<Category, DrinkTemplate[]> => {
  const grouped: Record<Category, DrinkTemplate[]> = {
    'Bière': [],
    'Soda': [],
    'Jus': [],
    'Eau': [],
    'Vin': [],
    'Autre': [],
  }

  CAMEROONIAN_DRINKS.forEach(drink => {
    grouped[drink.category].push(drink)
  })

  return grouped
}

// Get popular drinks across all categories
export const getPopularDrinks = (): DrinkTemplate[] => {
  return CAMEROONIAN_DRINKS.filter(drink => drink.popular)
}

// Search drinks by name
export const searchDrinks = (query: string): DrinkTemplate[] => {
  const normalizedQuery = query.toLowerCase().trim()
  if (!normalizedQuery) return CAMEROONIAN_DRINKS

  return CAMEROONIAN_DRINKS.filter(drink =>
    drink.name.toLowerCase().includes(normalizedQuery)
  )
}
