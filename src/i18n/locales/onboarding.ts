// 'onboarding' namespace — keys are flat, addressed as 'onboarding.<key>'.
export default {
  fr: {
    // Shared actions
    continue: 'Continuer',
    back: 'Retour',

    // Progress
    step: 'Étape {current} sur {total}',

    // Welcome
    welcomeTitle: 'Bienvenue sur BarTrack',
    welcomeSubtitle: 'Gérez votre bar en toute simplicité',
    welcomeTimeHint: 'Configuration en ~2 minutes',
    welcomeStart: 'Commencer',
    featureStockTitle: 'Gestion du stock',
    featureStockDesc: 'Suivez votre inventaire en temps réel et recevez des alertes de stock faible.',
    featureSalesTitle: 'Suivi des ventes',
    featureSalesDesc: 'Enregistrez vos sessions quotidiennes et calculez automatiquement vos profits.',
    featureAnalyticsTitle: 'Analyses & rapports',
    featureAnalyticsDesc: 'Visualisez vos tendances et identifiez vos produits les plus rentables.',
    featureSecureTitle: 'Données sécurisées',
    featureSecureDesc: 'Vos données sont sauvegardées en ligne et accessibles partout.',

    // Bar setup
    barStepTitle: 'Configuration du bar',
    barTitle: "Comment s'appelle votre bar ?",
    barDescription: 'Ce nom apparaîtra sur votre tableau de bord et vos rapports.',
    barLabel: 'Nom du bar',
    barPlaceholder: 'Ex : Le Soleil Couchant',
    barExamplesTitle: 'Exemples',
    barExamples: 'Chez Mama Rose · Bar des Amis · Le Relax Lounge',
    barErrorRequired: 'Le nom du bar est requis',
    barErrorMin: 'Le nom doit contenir au moins 2 caractères',
    barErrorMax: 'Le nom ne peut pas dépasser 50 caractères',

    // Drink selection
    drinksStepTitle: 'Sélection des boissons',
    drinksTitle: 'Quelles boissons vendez-vous ?',
    drinksDescription: 'Sélectionnez toutes les boissons de votre inventaire.',
    drinksSearchPlaceholder: 'Rechercher une boisson…',
    drinksSelectedOne: '{count} boisson sélectionnée',
    drinksSelectedMany: '{count} boissons sélectionnées',
    drinksCategoryAll: 'Tous',
    drinksEmpty: 'Aucune boisson trouvée',
    drinksPopular: 'Populaire',

    // Customize / prices
    customizeStepTitle: 'Configuration des prix',
    customizeTitle: 'Configurez vos boissons',
    customizeDescription: "Définissez le prix de vente et le coût d'achat de chaque boisson.",
    customizeProgress: '{done} sur {total} configurées',
    customizeTapToConfig: 'Appuyez pour configurer',
    customizeSalePrice: 'Prix de vente',
    customizeUnitCost: 'Coût unitaire',
    customizeMargin: 'Marge',

    // Editor
    editorCassierQtyLabel: 'Unités par caisse / cassier',
    editorCassierQtyPlaceholder: 'Ex : 12',
    editorCassierCostLabel: "Coût d'une caisse (FCFA)",
    editorCassierCostPlaceholder: 'Ex : 4800',
    editorPriceLabel: 'Prix de vente unitaire (FCFA)',
    editorPricePlaceholder: 'Ex : 600',
    editorSupplierLabel: 'Fournisseur (optionnel)',
    editorSupplierPlaceholder: 'Ex : SABC',
    editorInitialStockLabel: 'Stock initial (optionnel)',
    editorInitialStockPlaceholder: 'Ex : 24',
    editorAutoCalc: 'Calculs automatiques',
    editorCostPerUnit: 'Coût unitaire',
    editorProfitPerUnit: 'Profit par unité',
    editorMargin: 'Marge',
    editorCancel: 'Annuler',
    editorSave: 'Enregistrer',
    editorSaving: 'Enregistrement…',
    editorErrorQty: 'Quantité requise (> 0)',
    editorErrorCost: 'Coût requis (> 0)',
    editorErrorPrice: 'Prix requis (> 0)',

    // Review / stock overview
    reviewStepTitle: 'Aperçu du stock',
    reviewTitle: 'Votre inventaire est prêt !',
    reviewDescription: 'Voici un aperçu de votre configuration. Vous pourrez ajouter du stock ensuite.',
    reviewStatDrinks: 'Boissons',
    reviewStatStock: 'Stock actuel',
    reviewStatValue: 'Valeur du stock',
    reviewYourDrinks: 'Vos boissons',
    reviewDrinksCountOne: '{count} boisson',
    reviewDrinksCountMany: '{count} boissons',
    reviewStockLabel: 'Stock : 0',
    reviewNextTitle: 'Prochaines étapes',
    reviewNextText: "Après cette configuration, ajoutez du stock à vos boissons depuis l'écran Inventaire.",

    // Tour
    tourDoneTitle: 'Configuration terminée !',
    tourDoneSubtitle: 'Découvrez les fonctionnalités de BarTrack',
    tourSlide1Title: 'Tableau de bord',
    tourSlide1Desc: 'Visualisez vos ventes, profits et performances en temps réel avec des graphiques clairs.',
    tourSlide2Title: 'Sessions quotidiennes',
    tourSlide2Desc: 'Enregistrez vos ventes du jour, suivez les achats et calculez vos profits automatiquement.',
    tourSlide3Title: 'Gestion du stock',
    tourSlide3Desc: 'Suivez votre inventaire, recevez des alertes et gérez vos réapprovisionnements.',
    tourSlide4Title: 'Analyses & rapports',
    tourSlide4Desc: 'Identifiez vos produits les plus rentables et suivez les tendances de votre bar.',
    tourFinish: 'Commencer à utiliser BarTrack',
    tourSkip: 'Passer la visite',

    // Finishing (staged loader)
    finishingCreatingBar: 'Création de votre bar…',
    finishingAddingDrinks: 'Ajout de vos boissons…',
    finishingWrapping: 'Finalisation…',
    finishingDone: "C'est prêt !",

    // Errors
    errorTitle: 'Erreur',
    errorCompleteFail: 'Impossible de terminer la configuration : {msg}. Veuillez réessayer.',
    errorRetry: 'Réessayer',
    errorCancel: 'Annuler',
  },
  en: {
    // Shared actions
    continue: 'Continue',
    back: 'Back',

    // Progress
    step: 'Step {current} of {total}',

    // Welcome
    welcomeTitle: 'Welcome to BarTrack',
    welcomeSubtitle: 'Run your bar with ease',
    welcomeTimeHint: 'Setup takes ~2 minutes',
    welcomeStart: 'Get started',
    featureStockTitle: 'Stock management',
    featureStockDesc: 'Track your inventory in real time and get low-stock alerts.',
    featureSalesTitle: 'Sales tracking',
    featureSalesDesc: 'Log your daily sessions and calculate your profit automatically.',
    featureAnalyticsTitle: 'Insights & reports',
    featureAnalyticsDesc: 'Visualize your trends and spot your most profitable products.',
    featureSecureTitle: 'Secure data',
    featureSecureDesc: 'Your data is saved online and accessible from anywhere.',

    // Bar setup
    barStepTitle: 'Bar setup',
    barTitle: "What's your bar called?",
    barDescription: 'This name appears on your dashboard and your reports.',
    barLabel: 'Bar name',
    barPlaceholder: 'e.g. The Sunset Lounge',
    barExamplesTitle: 'Examples',
    barExamples: "Mama Rose's · Friends Bar · The Relax Lounge",
    barErrorRequired: 'Bar name is required',
    barErrorMin: 'Name must be at least 2 characters',
    barErrorMax: 'Name cannot exceed 50 characters',

    // Drink selection
    drinksStepTitle: 'Drink selection',
    drinksTitle: 'Which drinks do you sell?',
    drinksDescription: 'Select every drink in your inventory.',
    drinksSearchPlaceholder: 'Search a drink…',
    drinksSelectedOne: '{count} drink selected',
    drinksSelectedMany: '{count} drinks selected',
    drinksCategoryAll: 'All',
    drinksEmpty: 'No drinks found',
    drinksPopular: 'Popular',

    // Customize / prices
    customizeStepTitle: 'Price setup',
    customizeTitle: 'Configure your drinks',
    customizeDescription: 'Set the sale price and purchase cost for each drink.',
    customizeProgress: '{done} of {total} configured',
    customizeTapToConfig: 'Tap to configure',
    customizeSalePrice: 'Sale price',
    customizeUnitCost: 'Unit cost',
    customizeMargin: 'Margin',

    // Editor
    editorCassierQtyLabel: 'Units per case / cassier',
    editorCassierQtyPlaceholder: 'e.g. 12',
    editorCassierCostLabel: 'Cost of one case (FCFA)',
    editorCassierCostPlaceholder: 'e.g. 4800',
    editorPriceLabel: 'Unit sale price (FCFA)',
    editorPricePlaceholder: 'e.g. 600',
    editorSupplierLabel: 'Supplier (optional)',
    editorSupplierPlaceholder: 'e.g. SABC',
    editorInitialStockLabel: 'Initial stock (optional)',
    editorInitialStockPlaceholder: 'e.g. 24',
    editorAutoCalc: 'Automatic calculations',
    editorCostPerUnit: 'Unit cost',
    editorProfitPerUnit: 'Profit per unit',
    editorMargin: 'Margin',
    editorCancel: 'Cancel',
    editorSave: 'Save',
    editorSaving: 'Saving…',
    editorErrorQty: 'Quantity required (> 0)',
    editorErrorCost: 'Cost required (> 0)',
    editorErrorPrice: 'Price required (> 0)',

    // Review / stock overview
    reviewStepTitle: 'Stock overview',
    reviewTitle: 'Your inventory is ready!',
    reviewDescription: "Here's an overview of your setup. You can add stock afterwards.",
    reviewStatDrinks: 'Drinks',
    reviewStatStock: 'Current stock',
    reviewStatValue: 'Stock value',
    reviewYourDrinks: 'Your drinks',
    reviewDrinksCountOne: '{count} drink',
    reviewDrinksCountMany: '{count} drinks',
    reviewStockLabel: 'Stock: 0',
    reviewNextTitle: 'Next steps',
    reviewNextText: 'After this setup, add stock to your drinks from the Inventory screen.',

    // Tour
    tourDoneTitle: 'Setup complete!',
    tourDoneSubtitle: 'Discover what BarTrack can do',
    tourSlide1Title: 'Dashboard',
    tourSlide1Desc: 'Visualize your sales, profit and performance in real time with clear charts.',
    tourSlide2Title: 'Daily sessions',
    tourSlide2Desc: 'Log your daily sales, track purchases and calculate profit automatically.',
    tourSlide3Title: 'Stock management',
    tourSlide3Desc: 'Track your inventory, get alerts and manage restocking.',
    tourSlide4Title: 'Insights & reports',
    tourSlide4Desc: 'Spot your most profitable products and follow your bar’s trends.',
    tourFinish: 'Start using BarTrack',
    tourSkip: 'Skip the tour',

    // Finishing (staged loader)
    finishingCreatingBar: 'Creating your bar…',
    finishingAddingDrinks: 'Adding your drinks…',
    finishingWrapping: 'Finishing up…',
    finishingDone: 'All set!',

    // Errors
    errorTitle: 'Error',
    errorCompleteFail: "Couldn't finish setup: {msg}. Please try again.",
    errorRetry: 'Retry',
    errorCancel: 'Cancel',
  },
} as { fr: Record<string, string>; en: Record<string, string> }
