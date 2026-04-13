# ClearPath — Disability Employment & Benefits Navigator

## What this app is
ClearPath is a web app for Employment Specialists and SSI/SSDI beneficiaries that combines:
1. A benefits impact calculator grounded in the official WIPA 2026 National Training Curriculum
2. A job matching engine that filters opportunities through a client's benefits-safe earnings range

## Source of truth
All benefits calculations are derived from the **WIPA 2026 National Training Curriculum** 
(VCU-NTDC). The SSI engine must match the official 27-step SSI Calculation Sheet from 
Chapter 3 exactly. Federal regulation determines the order of steps — taking them out of 
order produces wrong results.

## Tech stack
- Frontend: React + TypeScript + Vite
- Styling: Tailwind CSS
- Charts: Recharts
- Testing: Vitest
- Benefits engine: pure TypeScript modules (no external dependencies, fully unit-testable)

## Project structure
src/
engine/           ← pure TS calculation modules, no React imports
benefit-constants.ts   ← all 2026 SSA values, updated annually
ssi-calculator.ts      ← 27-step SSI calculation sheet
ssdi-tracker.ts        ← TWP/EPE/SGA state machine
medicaid-1619b.ts      ← 1619(b) Medicaid threshold modeling
scenario-engine.ts     ← takes job offer + profile → runs all engines
components/       ← React UI components
types/            ← shared TypeScript types
data/             ← static data (state thresholds, etc.)
tests/              ← Vitest unit tests
## 2026 SSA values (update every January)
- FBR individual: $994/month
- FBR couple: $1,491/month
- SGA non-blind: $1,690/month
- SGA blind: $2,830/month
- TWP monthly threshold: $1,210/month
- SEIE monthly max: $2,410 | annual max: $9,730
- Resource limit individual: $2,000 | couple: $3,000
- SSI break-even (earned income only): ~$2,167/month gross

## Critical calculation rules
- NEVER show a negative SSI payment — floor at $0, then check 1619(b)
- The $20 GIE and $65 EIE apply only ONCE to an eligible couple
- GIE is applied to unearned income FIRST; remainder applies to earned income
- Step order is fixed by federal regulation — do not reorder
- All calculations use GROSS income (before taxes/deductions)
- There is a 2-month RMA lag between income and adjusted payment — note this in UI
- Verify engine outputs against WIPA Chapter 3 worked examples before building UI

## Key disclaimers (must appear on all output screens)
"ClearPath provides estimates only. Social Security has final authority on all benefit 
calculations. Consult a certified CWIC before making employment decisions."

## Who uses this
- Employment Specialists at ENs, VR agencies, nonprofits (primary)
- CWICs / CPWICs at WIPA-funded programs
- SSI/SSDI beneficiaries (self-service, free tier)

## Current sprint
Sprint 1 — Benefits engine (pure TypeScript, fully tested before any UI)