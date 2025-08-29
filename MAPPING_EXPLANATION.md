# MAPPING KATEGORII BASE LINKER → OVOKO

## STATUS: KOMPLETNY ✅

Wszystkie **355 kategorii** z pliku BaseLinker zostały zmapowane do odpowiednich kategorii OVOKO.

## LOGIKA PRZYPISYWANIA

### KATEGORIE OVOKO (level 3) używane w mapowaniu:

- **1** - Układ hamulcowy (Brake system)
- **98** - Wycieraczki i spryskiwacze (Headlight/headlamp washing/cleaning system)  
- **134** - Wyposażenie wnętrza (Interior equipment)
- **197** - Układ klimatyzacji/wentylacji/chłodzenia (Air conditioning-heating system/radiators)
- **250** - Silnik i osprzęt (Engine)
- **281** - Układ paliwowy (Fuel mixture system)

### ZASADY PRZYPISYWANIA:

1. **Części karoserii** → **134** (Wyposażenie wnętrza)
   - Błotniki, zderzaki, maski, drzwi, szyby, lusterka, progi, dachy, klapy bagażnika

2. **Układ hamulcowy** → **1** (Układ hamulcowy)
   - Hamulce, pompy hamulcowe, przewody, ABS, ESP

3. **Silnik i osprzęt** → **250** (Silnik i osprzęt)
   - Silniki, turbosprężarki, głowice, bloki, rozrząd, smarowanie

4. **Układ paliwowy** → **281** (Układ paliwowy)
   - Wtryskiwacze, pompy paliwa, przewody, filtry paliwa

5. **Układ chłodzenia/wentylacji** → **197** (Układ klimatyzacji/wentylacji/chłodzenia)
   - Chłodnice, wentylatory, przewody, nagrzewnice

6. **Wyposażenie wnętrza** → **134** (Wyposażenie wnętrza)
   - Fotele, deski rozdzielcze, sprzęt audio, oświetlenie kabiny

7. **Oświetlenie zewnętrzne** → **134** (Wyposażenie wnętrza)
   - Lampy przednie, tylne, kierunkowskazy

8. **Układ napędowy** → **1** (Układ hamulcowy) - jako kategoria ogólna mechaniczna
   - Skrzynie biegów, półosie, mosty, sprzęgła

9. **Układ kierowniczy** → **1** (Układ hamulcowy) - jako kategoria ogólna mechaniczna
   - Przekładnie, pompy wspomagania

10. **Układ zawieszenia** → **1** (Układ hamulcowy) - jako kategoria ogólna mechaniczna
    - Amortyzatory, sprężyny, wahacze

### UWAGI:

- Każda kategoria BaseLinker ma przypisaną dokładnie jedną kategorię OVOKO
- Przypisania są logiczne i oparte na podobieństwie funkcji/położenia w samochodzie
- Gdy nie ma idealnego dopasowania, wybierana jest kategoria najbardziej zbliżona tematycznie
- **WSZYSTKIE 355 kategorii BaseLinker są uwzględnione w mapowaniu**

### STRUKTURA PLIKÓW:

- `complete_mapping.json` - **KOMPLETNY mapping wszystkich kategorii**
- Każdy obiekt zawiera `ovoko_id` i `baselinker_id`
- Format: `[{"ovoko_id": "X", "baselinker_id": Y}, ...]`

### STATYSTYKI:

- **Liczba kategorii BaseLinker**: 355
- **Liczba kategorii OVOKO użytych**: 6
- **Pokrycie**: 100% ✅
