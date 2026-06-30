# Expected Print Output - Session Recap Page

This document shows the expected layout and content when printing the recap page from the Session screen.

---

## Print Layout Structure

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         SESSION RECAP PRINTOUT                          │
│                                                                         │
│                          BarTrack Inventory System                      │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

─────────────────────────────────────────────────────────────────────────

                           RÉSULTAT DU JOUR

                              15 750 CFA
                            Résultat net


         ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
         │   REVENU     │    │   ACHATS     │    │  DÉPENSES    │
         │  52 500 CFA  │    │  28 000 CFA  │    │  8 750 CFA   │
         └──────────────┘    └──────────────┘    └──────────────┘


─────────────────────────────────────────────────────────────────────────

                        COMPTE DE RÉSULTAT

Revenu des ventes                                          52 500 CFA
Unités vendues                                                    210

Coût des achats                                           -28 000 CFA
                                                          ─────────────
Marge brute                                                24 500 CFA

Dépenses opérationnelles                                   -8 750 CFA
                                                          ─────────────
Résultat net                                               15 750 CFA


─────────────────────────────────────────────────────────────────────────

                        MOUVEMENTS DE STOCK
                          42 articles

┌────────────────┬───────┬────────┬────────┬────────┬─────────┬──────────┐
│ Article        │ Début │ +Reçu  │  Dispo │ Compté │ Vendus  │  Revenu  │
├────────────────┼───────┼────────┼────────┼────────┼─────────┼──────────┤
│ Heineken       │   120 │   +48  │   168  │   144  │    24   │ 3 600 CFA│
│ Guinness       │    96 │   +24  │   120  │   108  │    12   │ 2 400 CFA│
│ Castel Beer    │   144 │   +72  │   216  │   192  │    24   │ 3 000 CFA│
│ 33 Export      │    72 │   +24  │    96  │    84  │    12   │ 1 800 CFA│
│ Flag           │    60 │    —   │    60  │    48  │    12   │ 1 500 CFA│
│ Coca-Cola      │   200 │   +96  │   296  │   248  │    48   │ 4 800 CFA│
│ Sprite         │   150 │   +48  │   198  │   174  │    24   │ 2 400 CFA│
│ Fanta Orange   │   120 │   +24  │   144  │   132  │    12   │ 1 200 CFA│
│ Schweppes      │    84 │    —   │    84  │    72  │    12   │ 1 500 CFA│
│ Top Grenadine  │    60 │   +12  │    72  │    60  │    12   │ 1 200 CFA│
│ Malta Guinness │    48 │    —   │    48  │    36  │    12   │ 1 800 CFA│
│ Jus d'Orange   │    36 │   +12  │    48  │    42  │     6   │   900 CFA│
│ Eau Minérale   │   240 │   +48  │   288  │   276  │    12   │   600 CFA│
│ Vin Rouge      │    12 │    —   │    12  │    10  │     2   │ 3 000 CFA│
│ Whisky         │     6 │    —   │     6  │     5  │     1   │ 5 000 CFA│
├────────────────┼───────┼────────┼────────┼────────┼─────────┼──────────┤
│ TOTAL          │   —   │  +408  │   —    │   —    │   210   │52 500 CFA│
└────────────────┴───────┴────────┴────────┴────────┴─────────┴──────────┘


─────────────────────────────────────────────────────────────────────────

                      DÉPENSES OPÉRATIONNELLES

┌─────────────────────────────────────────┬────────────────┬──────────────┐
│ Description                             │  Catégorie     │    Montant   │
├─────────────────────────────────────────┼────────────────┼──────────────┤
│ Salaire du barman                       │ Salaires       │  5 000 CFA   │
│ Électricité - générateur                │ Services       │  2 000 CFA   │
│ Eau                                     │ Services       │    500 CFA   │
│ Fournitures (gobelets, pailles)         │ Fournitures    │    750 CFA   │
│ Transport - livraison                   │ Transport      │    500 CFA   │
├─────────────────────────────────────────┼────────────────┼──────────────┤
│ TOTAL DES DÉPENSES                      │                │  8 750 CFA   │
└─────────────────────────────────────────┴────────────────┴──────────────┘


─────────────────────────────────────────────────────────────────────────

                            RÉSUMÉ FINANCIER

Chiffre d'affaires                                         52 500 CFA
Coût des marchandises vendues                             -28 000 CFA
                                                          ─────────────
Marge brute                                                24 500 CFA
Marge brute (%)                                                46.67%

Dépenses opérationnelles                                   -8 750 CFA
                                                          ─────────────
Résultat net                                               15 750 CFA
Marge nette (%)                                                30.00%


═════════════════════════════════════════════════════════════════════════

Document généré par BarTrack
Session du: Lundi 30 Juin 2026
Imprimé le: 30/06/2026 à 14:30
                                                     Page 1 sur 1

═════════════════════════════════════════════════════════════════════════
```

---

## Print Specifications

### Page Settings
- **Paper Size**: A4 Portrait
- **Margins**: 1.5cm top/right/left, 2cm bottom
- **Font**: Manrope (system font fallback)
- **Color Mode**: Full color (preserve profit/loss colors)

### Content Sections (in order)

1. **Hero Section - Résultat du jour**
   - Large centered number showing net profit
   - Color: Green if positive, Red if negative
   - Three stat pills: Revenue, Achats, Dépenses

2. **P&L Breakdown (Compte de résultat)**
   - Line-by-line profit/loss statement
   - Revenue from sales
   - Units sold (gray text, smaller)
   - Cost of purchases (red)
   - Gross profit (blue, highlighted)
   - Operating expenses (red)
   - Net profit (green/red, bold)

3. **Stock Movement Table (Mouvements de stock)**
   - Full detailed table with all active items
   - Columns:
     - Article name
     - Opening stock (Début)
     - Purchased (+Reçu) - green when > 0
     - Available (Dispo)
     - Counted (Compté)
     - Sold (Vendus) - blue when > 0
     - Revenue - blue, formatted as money
   - Total row at bottom (highlighted background)

4. **Operational Expenses (if any)**
   - Table of all expenses for the day
   - Description, Category, Amount
   - Total at bottom

5. **Footer**
   - Document metadata
   - Generated by BarTrack
   - Session date
   - Print timestamp
   - Page number

### Elements Hidden in Print
- Print button
- Navigation elements
- Step indicators
- Any interactive UI elements
- Icons (except where essential)

### Color Coding
- **Profit/Positive**: Green (#10B981)
- **Loss/Negative**: Red (#EF4444)
- **Primary/Revenue**: Blue (#4A90E2)
- **Neutral**: Gray shades

### Typography
- Headers: Bold, 15-17pt
- Body text: Regular, 11pt
- Table text: 10-11pt
- Footer: 9pt

---

## Quality Checklist

When testing print output, verify:

- [ ] All sections are visible (not blank)
- [ ] Numbers are properly formatted with spaces (e.g., "52 500 CFA")
- [ ] Colors are preserved (profit green, loss red)
- [ ] Table borders are clean and visible
- [ ] No content is cut off at page edges
- [ ] Tables don't break awkwardly across pages
- [ ] Footer includes correct date and page number
- [ ] No UI buttons or controls visible
- [ ] Professional appearance suitable for business records
- [ ] All text is legible at printed size

---

## Browser Print Settings (User Guide)

When clicking "Imprimer le récapitulatif complet":

1. **Print Dialog Opens**
   - Destination: Select your printer or "Save as PDF"
   - Pages: All
   - Layout: Portrait
   - Color: Color (not black and white)
   - Margins: Default

2. **Optional Settings**
   - Background graphics: ON (to preserve colors)
   - Headers and footers: OFF (we have custom footer)

3. **Preview Check**
   - Scroll through preview to verify all content visible
   - Check that colors appear correctly
   - Verify no blank pages

4. **Print/Save**
   - Click "Print" to print
   - Or "Save" to create PDF for records

---

**Note**: This reference document shows the ideal output. Actual content will vary based on the session data, but the structure and formatting should match this template.
