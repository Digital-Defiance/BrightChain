# BrightChain i18n Audit Report

Updated: 2026-04-17

## Status Summary

| Module | Component Strings | Enum Translations | Translation Hook | Components Using i18n |
|--------|------------------|-------------------|------------------|----------------------|
| brightchain-lib | ✅ 8 languages | ✅ 7 enums | N/A (core engine) | N/A |
| brightchart-lib | ✅ 547 keys × 8 langs | ✅ 55 enums | ✅ t + tEnum | **58 of 64** (6 infra) |
| brighthub-lib | ✅ 8 languages | ✅ 13 enums | ✅ t + tEnum | ✅ tEnum wired in 7 components |
| brightpass-lib | ✅ 8 languages | ❌ 0 enums (not needed) | ✅ t + tEnum | Uses t() |
| brightmail-lib | ✅ 152 keys × 8 langs | ❌ 0 enums | ✅ t + tEnum | **18 of 20** (2 infra) |

## Remaining: infrastructure-only components (no translatable strings)

These components have zero user-facing hardcoded strings — they are routing shells, logic gates, context providers, or compose already-translated child components:

- **brightchart**: PermissionGate, PermissionGuardedRoute, AdminWorkspace, ClinicianWorkspace, PatientPortal, ChartHeader
- **brightmail**: AvatarCircle, BrightMailContext

## What's Done (cumulative)

- **BrightChartStrings**: 547 keys translated in all 8 languages
- **BrightMailStrings**: 152 keys translated in all 8 languages
- **Enum translations**: 55 in brightchart-lib, 13 in brighthub-lib, 7 in brightchain-lib = **75 total**
- **Translation hooks**: `t()` + `tEnum()` in all 4 module hooks
- **Switch/case label functions**: 11 eliminated, replaced with `tEnum()`
- **Hardcoded UI strings**: 200+ replaced with `t()` across 60+ components
- **BrightHub tEnum wired**: 7 components (ConnectionStrengthIndicator, UserProfileCard, NotificationCategoryFilter, NotificationPreferences, ConnectionSuggestions, ConnectionListManager, ConnectionListCard)
- **BrightMail**: All 18 UI components on `useBrightMailTranslation`
- **BrightChart shell/clinical/scheduling**: ClinicalTimeline, NoteTemplateSelector, EncounterWorkflowBoard, ScheduleEditor, ConnectivityIndicator, NotificationBell, RoleSwitcher, PatientHeader, Sidebar, BottomNav, BrightChartLayout all wired

## Pre-existing issues (not i18n related)

- **brighthub-lib build failure**: Unrelated rootDir tsconfig issue. Enum translation files pass diagnostics cleanly.
