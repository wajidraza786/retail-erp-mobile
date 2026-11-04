# Accounts & Inventory

An offline mobile app for small retail and wholesale shops. It runs sales, purchases, stock and full double-entry books from a phone, and prints receipts on 58 mm and 80 mm Bluetooth thermal printers.

Every invoice and voucher posts balanced journal entries, so every report reads from one ledger and the books always agree.

- **Spec:** [docs/PRD.md](docs/PRD.md)
- **Design reference:** [docs/design/Accounts Inventory App.dc.html](docs/design/Accounts%20Inventory%20App.dc.html), an interactive prototype and the source of truth for layout, copy and colours

## Features

- **Home dashboard:** today's sales with a 7-day chart, cash and bank, profit this month, money to receive and to pay, quick actions, low-stock alerts, report shortcuts and recent activity.
- **Sales and purchases:** invoices and returns with live totals, discounts, part payments and stock checks. A return can be prefilled from its original invoice.
- **Customers and suppliers:** balances and a ledger for each party, with "Receive payment" / "Make payment" shortcuts.
- **Inventory:** products, categories and brands, stock on hand, profit per piece and reorder alerts.
- **Accounts:** cash receipt, cash payment and journal vouchers; a chart of accounts tree; a ledger for every account.
- **Nine reports:** Cash Book, Profit & Loss, Balance Sheet, Trial Balance, General Ledger, Sales Report, Purchase Report, Stock Summary and Stock Ledger, each with drill-down to the source document.
- **Printing and sharing:** 58 / 80 mm receipts for invoices, vouchers and every report. Print directly over Bluetooth, send as WhatsApp text, save as PDF or share the PDF.
- **Settings:** business name, negative-stock rule, printer setup and test page, receipt footer, and database backup / restore.
- **Fully offline:** all data lives in SQLite on the phone. There is no account or server.

## Tech stack

Expo SDK 57 · React Native 0.86 · Expo Router · TypeScript (strict) · expo-sqlite + Drizzle ORM · TanStack Query · Zustand · FlashList · expo-print / expo-sharing · a local Kotlin Expo module for Bluetooth printing.

## Getting started

Requirements: Node 22 and npm. For native builds you also need Android Studio (Android SDK, JDK 17+) and/or Xcode.

```bash
npm install
npm start             # Expo dev server; press a / i, or scan with Expo Go
```

On first launch the app asks for the business name and opening cash, bank and furniture. Or tap **Load sample shop** to load the prototype's sample data (Raza Mobile Hub, two weeks of trading).

Expo Go runs everything except direct Bluetooth printing, which needs the native module in a development or release build:

```bash
npm run android       # build and run on a device or emulator
npm run ios           # build and run on a simulator or connected iPhone
```

## Commands

| Command | What it does |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run android` / `npm run ios` | Native development build (includes the Bluetooth module) |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `expo lint` |
| `npm test` | Jest: posting engine, money and date formatting, receipt layout and ESC/POS encoding |
| `npm run db:generate` | Create a Drizzle migration after editing `src/db/schema.ts` |

Run `npm run typecheck`, `npm run lint` and `npm test` before committing.

## Building

### Android APK (local)

```bash
npx expo prebuild --platform android
cd android && ./gradlew assembleRelease
# → android/app/build/outputs/apk/release/app-release.apk
```

This APK is signed with the debug key. It's fine for testing and sideloading, but not for the Play Store. For a store release, build with EAS (`npx eas-cli@latest build -p android`), which produces a signed `.aab`.

### iPhone (local)

`app.json` sets the Apple team (`ios.appleTeamId`). With the iPhone connected and trusted:

```bash
npx expo prebuild --platform ios
cd ios && xcodebuild -workspace AccountsInventory.xcworkspace -scheme AccountsInventory \
  -configuration Release -destination id=<DEVICE_UDID> -derivedDataPath build \
  -allowProvisioningUpdates build
xcrun devicectl device install app --device <DEVICE_UDID> \
  build/Build/Products/Release-iphoneos/AccountsInventory.app
```

The first time, approve the developer profile on the phone in *Settings › General › VPN & Device Management*. Builds signed with a free Apple account stop opening after 7 days and need reinstalling.

The `android/` and `ios/` folders are generated (Continuous Native Generation) and gitignored. Configure native behaviour in `app.json` instead of editing them.

## Printing (58 mm / 80 mm thermal)

Invoices, vouchers and all nine reports have a **Print / Share** action:

- **Print:** sends ESC/POS text straight to the Bluetooth printer chosen in *Settings › Printer*. With no printer saved, or on iPhone, it opens the system print dialog with a PDF the width of the roll.
- **Send on WhatsApp:** opens the customer's or supplier's chat with the receipt as text. Local numbers such as `0300 1234567` are converted to `92…`.
- **Save PDF:** on Android you pick a folder; on iPhone the file goes to *Files › Accounts & Inventory › Receipts*.
- **Share PDF:** the system share sheet (WhatsApp, email, Drive …).

**Printer setup:**
1. Pair the printer once in the phone's Bluetooth settings (the PIN is usually `0000` or `1234`).
2. In *Settings › Printer*, choose the printer and set the paper width.
3. Print a test page. The number ruler should end exactly at the right edge.

Turn off **Cut paper after printing** if your printer has no auto-cutter.

Direct printing uses classic Bluetooth (SPP), which most generic ESC/POS thermal printers use. It works in the Android app only: iPhones can't connect to classic Bluetooth printers, so on iOS Print always uses AirPrint.

Every receipt is described once as a list of lines (`src/features/printing/receipt.ts`) and rendered three ways: ESC/POS bytes, HTML/PDF sized to the paper, and monospace WhatsApp text. On 58 mm paper, wide report tables print each row on two lines so amounts are never cut off.

## Project structure

```
src/
  app/                  Routes only (Expo Router). Each file re-exports a screen from features/
    (tabs)/             Home, Sales, Purchase, Inventory, Accounts
    invoice/ voucher/ ledger/ report/ product.tsx settings.tsx setup.tsx
  features/             Screens, sheets and components, grouped by domain
    home/ trade/ inventory/ accounts/ invoices/ vouchers/ parties/ reports/ settings/
    printing/           Receipt layout, ESC/POS encoder, PDF / WhatsApp output, Print / Share sheet
    shared/             Document-type labels and colours, typed navigation helpers
  components/
    ui/                 Design-system kit: headers, rows, fields, chips, bottom sheets, date range bar …
    navigation/         Custom tab bar
  db/
    schema.ts           Drizzle tables (money in integer paisa)
    client.ts           expo-sqlite + Drizzle (WAL mode, foreign keys)
    migrations/         drizzle-kit output, applied at startup
    seed.ts             Chart of accounts, walk-in customer and settings row (first launch)
    demo.ts             Sample shop from the prototype
    services/           All writes. ledger.ts holds the pure posting rules
    queries/            Read models: balances, lists, dashboard, stock on hand
    reports/            One file per report
    hooks/              TanStack Query wrappers used by screens
  lib/                  money, format, dates, phone, backup, queryClient
  store/                Zustand: shared report date range, tab segments, toast
  theme/                Colour, radius and spacing tokens; typography and fonts
  types/                Ambient type declarations
modules/
  bluetooth-printer/    Local Expo module (Kotlin, Android only): lists paired devices, prints ESC/POS
docs/                   PRD and design prototype
```

## How the accounting works

1. **Postings are the only source of truth for money.** Saving an invoice or voucher writes the document, its lines, its stock movements and its postings in one transaction, and the write fails unless Σ debit = Σ credit. Reports read postings only.
2. **Stock on hand = Σ stock movements.** Opening stock is itself a movement.
3. **Screens never write to the database directly.** Every write goes through `src/db/services/*`, which validates first and throws a `ValidationError` with user-facing messages.
4. **Money is stored as integer paisa.** It is converted only in `src/lib/money.ts`.
5. **The posting rules are pure functions** in `src/db/services/ledger.ts`, unit-tested for every document type.

### Database changes

Edit `src/db/schema.ts`, then run `npm run db:generate`. Migrations run automatically when the app starts. Never edit a migration that has already shipped.

## Known limitations

- Saved invoices and vouchers can't be edited or deleted yet. Corrections are made with a return or a journal voucher.
- Receipts print in English (ASCII) only; Urdu would need image-mode printing.
- Bluetooth Low Energy-only printers are not supported, and iPhone printing goes through AirPrint.
- There is no app lock (PIN or biometrics) and no multi-device sync yet. Cloud sync is planned for phase 2 (see the PRD).

### Where the code differs from the PRD

- Navigation uses Expo Router (file-based) rather than a hand-written React Navigation setup. The code lives at the repo root, not in `/mobile`.
- Bottom sheets use React Native's `Modal`, not `@gorhom/bottom-sheet`.
- Lists refresh by invalidating TanStack Query after each write, instead of Drizzle's `useLiveQuery`.
