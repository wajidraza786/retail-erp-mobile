# PRD — Accounts & Inventory Mobile App

**Product:** Accounts & Inventory app for small retail and wholesale shops
**Version:** 1.0 (MVP)
**Design reference:** `Accounts Inventory App.dc.html`, the interactive prototype in this project. It is the source of truth for layout, copy, colours and flows.
**Target build tool:** Claude Code
**Stack:** React Native (Expo, TypeScript), **local-first** with on-device SQLite (`expo-sqlite` + Drizzle ORM). A Django REST Framework sync backend comes in phase 2.

---

## 1. Summary

A mobile app that lets a **shop owner who is not an accountant** run sales, purchases, stock and full double-entry books from a phone. Every invoice and voucher automatically posts balanced journal entries, so Cash Book, Profit & Loss, Balance Sheet, Trial Balance, General Ledger and stock reports are always correct and always agree with each other.

### Goals
1. Create a sale or purchase invoice in under 30 seconds.
2. Never ask the user to think in debits and credits, except in the Journal Voucher.
3. Stock quantities and account balances update automatically from transactions.
4. Every report is derived from one ledger of postings, so the books always balance.

### Non-goals (v1)
- Taxes (GST/VAT): **none**
- Multi-currency (PKR only, shown as `Rs 12,399`)
- Multi-branch or multi-warehouse
- Payroll, bank reconciliation, cheque management
- Barcode scanning (phase 2)
- Multiple payment methods on invoices. In v1, "paid now" always means **cash**.

### Primary user
A shop owner or manager (for example a mobile-accessories retailer in Lahore). They are comfortable with WhatsApp-level UI. Accounting terms appear, but each one has a plain-language explanation next to it ("Owes you", "What you own", "Money came into the cash drawer").

---

## 2. Tech stack & architecture

Follow the team conventions (`react-native-expo-conventions`, `django-drf-conventions`).

### Mobile (`/mobile`)
| Concern | Choice |
|---|---|
| Framework | Expo SDK (latest stable), managed workflow, TypeScript strict |
| Navigation | React Navigation v7. Root native-stack containing a bottom-tab navigator and modal or detail screens. Typed `RootStackParamList` |
| **Local database** | **`expo-sqlite`** opened with `openDatabaseSync('books.db', { enableChangeListener: true })`, with WAL mode and foreign keys on (`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;`) |
| **ORM** | **Drizzle ORM** (`drizzle-orm/expo-sqlite`), schema in TypeScript, migrations via `drizzle-kit generate` (`dialect: 'sqlite'`, `driver: 'expo'`), applied at startup with `useMigrations(db, migrations)` |
| Data access | One repository/service layer in `src/db/` (no SQL in screens). Lists use Drizzle `useLiveQuery` so they auto-refresh after writes. Reports are plain async query functions wrapped in TanStack Query (`['report', type, range]`), invalidated after every write |
| IDs | `expo-crypto` `randomUUID()` (text primary keys, sync-safe for phase 2) |
| Money | **Integer paisa** (`Rs 12,399.00` → `1239900`). Never use floats. Convert only in `lib/money.ts` |
| Dates | ISO `YYYY-MM-DD` text for business dates; ISO timestamp text for `created_at`/`updated_at` |
| Client state | Zustand (report date-range, draft invoice/voucher, app settings cache) |
| Dev tools | `expo-drizzle-studio-plugin` for inspecting the DB in development |
| Backup | Manual "Export backup" (copy the `.db` file via `expo-file-system` + `expo-sharing`) and "Restore" in Settings |
| Styling | `StyleSheet` + `theme/tokens.ts` (colors, type, radii, spacing). No inline magic numbers |
| Lists | `FlashList` for every list that can grow |
| Fonts | `expo-font`: Bricolage Grotesque (600/700/800), DM Sans (400–700), JetBrains Mono (500/600) |
| Icons | `react-native-svg`, with the stroke icons from the prototype (24×24, stroke 2, round caps) |
| Bottom sheets | `@gorhom/bottom-sheet` |
| Dates | `date-fns`; native date picker via `@react-native-community/datetimepicker` |
| Builds | EAS (`development`, `preview`, `production` profiles) |
| Config | `app.config.ts` + `expo-constants` (phase 2: `API_BASE_URL`) |

### Backend (phase 2, `/backend`)
This is optional cloud sync and backup for multi-device use: Django 5 + DRF + PostgreSQL, JWT auth, `/api/v1/sync/` push/pull of changed rows by `updated_at` (see §8). **v1 runs completely offline with no backend.**

### Key architectural rules
1. **The `postings` table is the single source of truth for money.** Invoices and vouchers are documents. Saving one runs a service that writes the document, its lines, its postings and its stock movements inside **one `db.transaction()`**. Reports only read postings and stock movements. They never recompute from documents.
2. **Stock works the same way.** The `stock_movements` table is written by invoice services, and stock-on-hand = `Σ movements` (opening stock is itself a movement).
3. **All writes go through `src/db/services/*`.** Screens never call `db.insert` directly. Every service validates first, then writes, then checks `Σ debit == Σ credit` for the document and throws (rolling back) if not.

---

## 3. Design system (from prototype)

### 3.1 Colour tokens
| Token | Hex | Use |
|---|---|---|
| `ink` | `#17161c` | Primary text, dark buttons, FAB, Trial Balance tile |
| `muted` | `#6b6874` | Secondary text |
| `bg` | `#f4f1ea` | App background (warm off-white) |
| `card` | `#ffffff` | Cards, rows, inputs |
| `line` | `rgba(23,22,28,.06–.10)` | Dividers, input borders |
| `sales` / `salesLight` | `#0b8049` / `#d7f2e3` | Sales module, money in, Cash Book tile, CRV |
| `purchase` / `purchaseLight` | `#2a5fd6` / `#dfe7fc` | Purchase module, Balance Sheet tile |
| `inventory` / `inventoryDark` / `inventoryLight` | `#f0a020` / `#9a6200` / `#fdecc8` | Inventory module (ink text on amber), stock report tiles |
| `accounts` / `accountsLight` | `#6d3fd6` / `#ebe3fc` | Accounts module, JV, General Ledger tile |
| `report` / `reportLight` | `#d9472b` / `#fde0d8` | Profit & Loss, CPV, money out, low-stock and error states |
| `danger text` | `#9e2a14` / `#b3301a` | Error text, low-stock text |
| `stockLedgerTile` | `#7a4d00` | Stock Ledger tile |

**Module colour rule:** each tab owns a colour. That colour fills its header block (rounded bottom corners, 32px), the active tab pill, the primary button on its forms, and its document badges.

### 3.2 Typography
| Role | Font | Size/weight |
|---|---|---|
| Tab title | Bricolage Grotesque | 34 / 800, letter-spacing −0.03em |
| Screen title | Bricolage Grotesque | 22 / 800 |
| Hero number | Bricolage Grotesque | 36–42 / 800, tabular numbers |
| Section title | Bricolage Grotesque | 17 / 700 |
| Body / row title | DM Sans | 14–15 / 600 |
| Meta / sub | DM Sans | 12 / 400–500, `muted` |
| Codes (SKU, account codes) | JetBrains Mono | 11–14 / 500 |

All amounts use `fontVariant: ['tabular-nums']`.

### 3.3 Shape & spacing
- Radii: cards 18–22, tiles 24, header 28–32, inputs 12–14, pills 99, icon badges 13–15.
- Screen horizontal padding: 16. Card padding: 13–16. List gap: 8.
- Inputs: height 50 (forms), 36–44 (inline), 1.5px border `line`.
- Primary button: height 54, radius 18, full width, inside a white sticky footer with a top border.
- FAB: extended pill, height 54, `ink` background, bottom-right, 16 from edges, shadow.
- Minimum hit target: 44px.

### 3.4 Reusable components (build in `components/ui/`)
`ModuleHeader`, `SegmentedControl` (on colour or on white), `SearchField`, `FilterChips`, `DocRow` (badge + title/sub + amount + status pill), `PartyRow` (avatar initials + balance + "owes you/you owe/settled"), `ProductRow` (tinted initials tile + stock pill), `StatTile`, `AmountText`, `StatusPill`, `QtyStepper`, `MoneyInput`, `PickerField` (avatar + label + value + chevron, opens a sheet), `BottomSheetList` (with section headers and search), `DateRangeBar` (From/To + presets), `ExpandableCard`, `LedgerRow` (date block + title/ref + amount + running balance), `ReportTile`, `Toast`, `ErrorBanner`, `EmptyState`.

### 3.5 Formatting
- Money: `Rs 12,399` (en-US grouping, no decimals in display, 2 decimals stored).
- Negative: `−Rs 3,799` in lists; `(Rs 3,799)` in statements and trial balance.
- Date in rows: `14 Oct`. Date block in ledgers: day number large, month small.
- Initials avatar: the first letters of up to 2 words.

---

## 4. Navigation map

```
RootStack
├── MainTabs (bottom tabs, 84px bar, pill highlight in module colour)
│   ├── Home
│   ├── Sales        [Invoices | Returns | Customers]
│   ├── Purchase     [Invoices | Returns | Suppliers]
│   ├── Inventory    [Products | Categories | Brands]
│   └── Accounts     [Vouchers | Accounts (COA) | Reports]
├── InvoiceForm      { kind: 'SI'|'SR'|'PI'|'PR', prefill? }
├── InvoiceDetail    { id }
├── Ledger           { accountKey }          // any account incl. customer/supplier
├── ProductForm      { id? }
├── VoucherForm      { kind: 'CRV'|'CPV'|'JV', prefill? }
├── VoucherDetail    { id }
├── Report           { type: 'cashbook'|'pl'|'bs'|'tb'|'gl'|'sales'|'purchase'|'stock'|'stockledger', productId? }
└── Sheets (bottom sheets, not routes): PartyPicker, ProductPicker, AccountPicker,
    VoucherTypeChooser, QuickAdd (category | brand | customer | supplier), StockProductPicker
```
The tab bar is hidden on every pushed screen. Every pushed screen has a 40px round back button at top-left on its coloured header.

---

## 5. Data model (Drizzle / SQLite)

Define every table in `src/db/schema.ts` with `sqliteTable`. Every table has `id text primary key` (uuid), `created_at text`, `updated_at text`, and `deleted_at text` (soft delete, which phase-2 sync needs). Money columns are `integer` (paisa). Quantities are `integer`. Booleans are `integer({ mode: 'boolean' })`. Enums are `text({ enum: [...] })`. Add indexes on every FK, on `(kind, date)` for invoices and vouchers, on `(account_id, date)` for postings and on `(product_id, date)` for stock movements.

A single-row **`settings`** table holds the business name, opening cash, bank and furniture, `allow_negative_stock`, the number sequences per kind (`next_SI`, `next_PI`, …) and `seeded_at`.

The entities below are written in model notation. Map them 1:1 to tables: `customers`, `suppliers`, `categories`, `brands`, `products`, `stock_movements`, `invoices`, `invoice_lines`, `vouchers`, `voucher_lines`, `accounts`, `postings`.

### parties
**Customer**: `name`, `phone`, `opening_balance` (they owe you), `is_walk_in` (one per business, seeded "Walk-in Customer", cannot be deleted)
**Supplier**: `name`, `phone`, `opening_balance` (you owe them)

### catalog
**Category**: `name` (unique per business)
**Brand**: `name` (unique per business)
**Product**: `name`, `sku` (unique, auto-generate if blank), `category FK`, `brand FK`, `cost_price`, `sale_price`, `opening_stock` (int), `reorder_level` (int), `unit` (default "pcs"), `is_active`
**StockMovement**: `product FK`, `date`, `qty` (signed int), `rate`, `source_type` (`opening|SI|SR|PI|PR`), `source_id`

### sales / purchases
**Invoice** (one table with `kind`; or two tables sharing an abstract base):
`kind` (`SI|SR|PI|PR`, TextChoices), `number` (e.g. `SI-1049`, unique per business+kind, auto-increment, zero-padded), `date`, `customer FK?` / `supplier FK?` (exactly one, by kind), `discount`, `paid_amount` (cash paid or refunded now), `notes`, `source_invoice FK?` (a return links to its original), `status` (computed: `paid|partial|unpaid` for SI/PI, `refunded|credited` for returns)
**InvoiceLine**: `invoice FK`, `product FK`, `qty`, `rate`, `cost_at_time` (snapshot of product cost for COGS)

Computed: `subtotal = Σ qty×rate`, `total = max(0, subtotal − discount)`, `paid = min(paid_amount, total)`, `due = total − paid`.

### vouchers
**Voucher**: `kind` (`CRV|CPV|JV`), `number` (`CRV-0090`, `CPV-0158`, `JV-0023`), `date`, `narration`
**VoucherLine**: `voucher FK`, `account FK`, `debit`, `credit`
CRV and CPV are stored as two lines (cash + counter account) but are **entered** as one amount + one account.

### ledger
**Account** (Chart of Accounts tree):
`code`, `name`, `type` (`A|L|E|I|X`), `parent FK?`, `is_group`, `system_key` (e.g. `cash`, `bank`, `inv`, `ar`, `ap`, `sales`, `salesret`, `cogs`, `capital`), `party_type` (`customer|supplier|null`), `customer FK?`, `supplier FK?`
- Each customer gets an auto-created sub-account under **1103 Accounts Receivable** (`1103-01`, `1103-02`…). Each supplier gets one under **2101 Accounts Payable**.

**Posting** (journal line, immutable):
`date`, `account FK`, `debit`, `credit`, `memo`, `counterparty_label` (for Cash Book "who"), `source_type` (`opening|invoice|voucher`), `source_id`, `ref` (document number)

### Seed Chart of Accounts
```
1     Assets (A)
11      Current Assets
1101      Cash in Hand          [cash]
1102      Meezan Bank           [bank]
1103      Accounts Receivable   [ar]  → one child per customer
1104      Stock in Hand         [inv]
12      Fixed Assets
1201      Furniture & Fixtures  [furn]
2     Liabilities (L)
21      Current Liabilities
2101      Accounts Payable      [ap]  → one child per supplier
3     Equity (E)
3101    Owner's Capital         [capital]
3102    Drawings                [draw]
4     Income (I)
4101    Sales                   [sales]
4102    Sales Returns           [salesret]  (contra-income, debit balance)
4201    Other Income            [otherinc]
5     Expenses (X)
5101    Cost of Goods Sold      [cogs]
5201    Shop Rent
5202    Salaries
5203    Electricity
5204    Transport
5205    Miscellaneous
```
Users can add leaf accounts under any group in v1.1. In v1 the tree is seeded and read-only, except for party sub-accounts.

**Seeding:** on first launch, after migrations run, `db/seed.ts` inserts the COA, the Walk-in Customer and the `settings` row inside one transaction (guarded by `settings.seeded_at`). A **business-setup screen** collects the opening cash, bank and furniture, then calls `postOpening()`. A dev-only `seedDemo()` loads the prototype's sample data (Raza Mobile Hub).

---

## 6. Accounting engine (posting rules)

Write this in TypeScript as `src/db/services/ledger.ts → postInvoice(tx, invoice)`, `postVoucher(tx, voucher)`, `postOpening(tx)`. These are pure functions that build `{accountId, debit, credit, memo, counterparty, ref}[]` (unit-testable with no DB), plus a thin writer that inserts them. On edit or delete of a document: **delete its postings and stock movements, then re-post**, inside the same `db.transaction()`. Validate `Σ debit == Σ credit` before commit and throw if not.

Document numbers come from `settings.next_<KIND>` and are incremented in the same transaction (e.g. `SI-1050`, padded to 4 digits).

`T` = total, `P` = paid now, `C` = Σ qty × cost_at_time, `AR` = customer sub-account, `AP` = supplier sub-account.

| Document | Debit | Credit | Stock |
|---|---|---|---|
| **Sale Invoice (SI)** | AR T · Cash P · COGS C | Sales T · AR P · Stock C | −qty |
| **Sale Return (SR)** | Sales Returns T · AR P · Stock C | AR T · Cash P · COGS C | +qty |
| **Purchase Invoice (PI)** | Stock T · AP P | AP T · Cash P | +qty |
| **Purchase Return (PR)** | AP T · Cash P | Stock T · AP P | −qty |
| **Cash Receipt (CRV)** | Cash | Selected account | – |
| **Cash Payment (CPV)** | Selected account | Cash | – |
| **Journal (JV)** | Lines as entered | Lines as entered | – |
| **Opening** (business setup) | Cash, Bank, Furniture, Stock (Σ opening×cost), each customer's opening | Each supplier's opening; Capital = balancing figure | opening_stock |

Notes:
- An SI is posted gross to AR, and the cash part is then cleared from AR. This makes the customer ledger show both the invoice and the payment, which is how shop owners read it.
- Walk-in sales are posted against the Walk-in Customer's sub-account (normally nets to zero).
- Zero-amount lines are not written.

### Balance conventions
- `raw = Σ debit − Σ credit`
- **Natural balance** (shown to user): A and X → `raw`. L, E and I → `−raw`.
- Group balance = Σ natural balances of its leaves.
- Net profit = (Sales + Sales Returns[negative] + Other Income) − (COGS + expenses).

---

## 7. Screen specifications

Copy in quotes is the exact UI text from the prototype.

### 7.1 Home
- Header: date ("Wednesday 14 October"), business name (Bricolage 27/800), avatar initials.
- **Today's sales** card (sales green): total of today's SIs, chip "N invoices", 7-day bar chart of net sales (SI − SR). Today's bar is solid white and the others are 35% white. Tap → Sales tab.
- 2×2 tiles: **Cash in hand** (violet, sub "Bank Rs X") → Cash Book · **Profit this month** (coral) → P&L · **To receive** (white, green number, "from N customers") → Sales › Customers · **To pay** (white, blue number) → Purchase › Suppliers.
- **Quick actions** (4 square colour tiles): New sale, New purchase, Receive cash (CRV), Pay cash (CPV).
- **Running low** (amber card, only if any product has stock ≤ reorder): up to 4 rows, "N left" pill. Tap → ProductForm.
- **Reports** 2-column tile grid (colour square + title + key figure).
- **Recent activity**: last 5 invoices and vouchers by date. Badge shows the doc kind. Amount is prefixed + or − for vouchers.

### 7.2 Sales / Purchase tabs (same layout, module colour differs)
- Header: title, "October 2026" (current month), 2 stat tiles: "Net sales this month" / "To receive" (or purchase equivalents), segmented control.
- Search: "Search by name or number" / "Search customers".
- **Invoices / Returns** segments: `DocRow` sorted by date desc. Sub: `SI-1049 · 14 Oct · 3 pcs`. Status pill colours: Paid (green), Partial (amber), Unpaid (coral), Refunded (green), Credited (grey).
- **Customers / Suppliers** segment: `PartyRow` with balance and label "owes you" / "you owe" / "settled" / "in advance". Tap → Ledger.
- FAB label changes with segment: "New invoice" / "New return" / "Add customer" (opens QuickAdd sheet).

### 7.3 Inventory tab (amber header, ink text)
- Stats: "Stock value (at cost)", "Running low".
- **Products**: category chips (All + categories), `ProductRow` (initials of brand on category tint, name, brand · category, sale price, stock pill; coral if low). Tap → ProductForm (edit).
- **Categories / Brands**: rows with product count, pcs, stock value. Tapping a category filters Products by it; tapping a brand searches by brand.
- FAB: "Add product" / "Add category" / "Add brand".

### 7.4 Accounts tab (violet)
- Stats: Cash in hand, Meezan Bank.
- **Vouchers**: chips All / Receipts / Payments / Journals. Row: kind badge, narration, `CRV-0089 · 12 Oct · Zainab Traders`, amount (+green / −coral). FAB "New voucher" → VoucherTypeChooser sheet (3 coloured cards with plain descriptions).
- **Accounts (COA)**: helper text "Tap a group to open it, tap an account to see its ledger." Expandable tree rows: chevron, mono code, name (weight by depth), natural balance. Default expanded: 1, 11, 2, 21, 4, 5.
- **Reports**: full-width coloured tiles (title, plain description, key figure).

### 7.5 Invoice form (`InvoiceForm`)
- Coloured header: `SI-1050 · Today, 14 Oct`, "New Sale Invoice". The party `PickerField` (white card) opens PartyPicker, which has a search box, an "Add new customer" row first, and shows balances. SI defaults to Walk-in Customer.
- "Items" + "Add product" button opens ProductPicker. The sheet stays open, tapping a product adds it or increments it, the badge shows `×qty`, and the close label reads "Done".
- Line card: name, "N in stock" (coral "Only N in stock" if exceeded), QtyStepper (min 1), editable rate (default sale price for SI/SR, cost for PI/PR), line total, delete.
- Totals card: Subtotal, Discount input, **Total**, "Received now" / "Paid now" / "Refund paid now" / "Refund received now" + **Full** chip + input, then the balance row ("Balance due" / "Balance payable" / "Credited to account" / "Deducted from payable").
- Plain-language hint under the totals, e.g. "Rs 16,600 will be added to what Bilal Electronics owes you."
- Sticky footer: "Save sale · Rs 21,600".
- **Validation**: party required; ≥1 line; for SI and PR, qty ≤ stock on hand (unless the business setting `allow_negative_stock` is on); rate ≥ 0; paid is clamped to total.
- On save: replace the form with InvoiceDetail and show the toast "SI-1050 saved · stock and accounts updated".

### 7.6 Invoice detail
- Coloured header with title, number and a status pill. A receipt card overlaps the header: party, date, dashed divider, lines (`2 × Rs 3,200`), subtotal, discount, total (26/800), then tiles for Received/Paid and Due.
- Actions: "Customer returned items" / "Return items to supplier" opens a prefilled return (same party and lines, linked via `source_invoice`). "Customer ledger" / "Supplier ledger". "Share PDF" generates a PDF (expo-print) and opens the share sheet.

### 7.7 Ledger (any account)
- Header colour: green for customers, blue for suppliers, violet otherwise. Shows mono code, name, label ("Owes you" / "You owe" / "All settled" / "Paid in advance" / "Current balance") and a big balance.
- For a party: action buttons "Receive payment" (CRV prefilled with this account and the outstanding amount) and "New sale" (or "Make payment" / "New purchase").
- Rows newest first: date block, memo, ref, signed amount, running natural balance. Tap → source document.

### 7.8 Product form
- Amber header. In edit mode, show tiles "In stock now" and "Sold this month" plus a **"View stock ledger"** button.
- Fields: Product name, SKU / code (mono), Category chips + "+ New", Brand chips + "+ New" (QuickAdd sheet, which auto-selects the new item), Cost price, Sale price, the live "Profit per piece" bar (`Rs 800 · 25%`, coral if negative), Opening stock ("Stock you have now" when new), "Alert me below" (reorder level).
- Validation: name, cost > 0 and price > 0 are required. Opening stock can only be edited on create in v1.

### 7.9 Voucher form
- **CRV / CPV**: big centred amount input ("Rs" prefix, 42/800). `PickerField` "Received from" / "Paid to" opens AccountPicker with sections ordered by relevance (CRV: Customers, Income, Other; CPV: Suppliers, Expenses, Other). Narration field. A **"How this is recorded"** box shows the Dr/Cr preview lines.
- **JV**: line cards (account picker, Debit, Credit, remove). "+ Add line". A balance bar shows Debit and Credit totals and either "Balanced, ready to save" (green) or "Off by Rs X".
- Validation: CRV/CPV need an account and an amount > 0. JV needs ≥2 lines, every line with an account, Σdr = Σcr > 0.
- Save → VoucherDetail + toast "CRV-0090 posted to the books".

### 7.10 Voucher detail
Card showing date, narration, amount, and a Dr/Cr table with account names and codes.

### 7.11 Reports
All reports share a coloured header showing the period, title, hero figure and a chip. Every row drills down: account → Ledger, document → detail.

| Report | Contents |
|---|---|
| **Cash Book** (green) | Opening / Money in / Money out tiles; entries newest first with who, `ref · memo`, ±amount, running balance. Hero: closing cash |
| **Profit & Loss** (coral) | Revenue block (Sales, Less returns, Net sales, COGS, **Gross profit**); Expenses block; result block (green if profit, coral if loss). Chip: margin % |
| **Balance Sheet** (blue) | "What you own" (Cash, Bank, Customers owe you, Stock, Furniture); "What you owe" (Suppliers); "Owner's equity" (Capital, Drawings, Profit this period); footer "Liabilities + equity". Chip "Balanced: assets = liabilities + equity" |
| **Trial Balance** (ink) | Table: Account (name + mono code), Debit, Credit; totals; chip "Books are balanced · N accounts" |
| **General Ledger** (violet) | Search accounts, type chips (All/Assets/Liabilities/Equity/Income/Expenses), "Expand all". Each account is an expandable card (code · type · entry count, closing + Dr/Cr side). Expanded: Date·Particulars, Debit, Credit, Balance; Totals row; "Open account ledger" |
| **Sales Report** (green) / **Purchase Report** (blue) | DateRangeBar (From/To + Today, Yesterday, Last 7 days, This month). Search: party, product, SKU or invoice no. 6 summary tiles: Sales, Returns, Net, Received (Paid), Still to receive (pay), Gross profit (Avg. invoice). Group-by segments: **Invoices** (returns negative), **Products** (net qty, amount after pro-rata discount, profit), **Customers/Suppliers** (count, net, due) |
| **Stock Summary** (dark amber) | DateRangeBar, search (product/SKU/brand), category chips. Table: Product (value · SKU · brand), Open, In, Out, Close (coral pill if ≤ reorder); totals row. Tap → Stock Ledger for that product |
| **Stock Ledger** (deep amber) | Segment **One product / All products**. *One*: product picker card ("Change"), DateRangeBar, search; Opening/In/Out/Closing tiles; movements table (date, type · party, ref @ rate, In, Out, Bal) ending with "Opening stock b/f". *All*: grand totals, one expandable card per product (closing pill, Open/In/Out), expanded rows plus "Open product ledger" |

Date-range state is **shared** across Sales, Purchase, Stock Summary and Stock Ledger (Zustand `reportRange`). Default: first of the current month → today. If From > To, swap them.

**Stock report maths:** `opening(lo) = opening_stock + Σ movements with date < lo`; `in = Σ positive movements in [lo, hi]`; `out = Σ |negative| in [lo, hi]`; `closing = opening + in − out`; value = closing × current cost.

---

## 8. Local data API (`src/db/`)

Screens use only these functions and hooks. Phase-2 sync can be added behind them without touching UI.

| Area | Functions / hooks |
|---|---|
| Settings | `getSettings()`, `updateSettings(patch)`, `postOpening(values)` |
| Customers / Suppliers | `useCustomers(search)`, `useSuppliers(search)` (live, with natural balance via aggregate join on postings) · `createParty(type, {name, phone, opening})` (creates the party + AR/AP sub-account + opening posting in one tx) · `updateParty` |
| Categories / Brands | `useCategories()`, `useBrands()` (with product count, pcs, stock value) · `createCategory(name)`, `createBrand(name)` |
| Products | `useProducts({categoryId, search})` with `stockOnHand` · `getProduct(id)` · `saveProduct(input)` (creates the opening stock movement + opening stock posting on create) |
| Invoices | `useInvoices({kind, search})` · `getInvoice(id)` · `saveInvoice({kind, date, partyId, lines:[{productId, qty, rate}], discount, paid, sourceInvoiceId?})` → validates, numbers, snapshots `cost_at_time`, writes lines/movements/postings · `peekNextNumber(kind)` · `buildReturnDraft(invoiceId)` |
| Vouchers | `useVouchers({kind})` · `getVoucher(id)` · `saveVoucher({kind, date, narration, accountId?, amount?, lines?})` |
| Accounts | `getAccountTree()` (with natural balances) · `getLedger(accountId, {from, to})` |
| Dashboard | `getDashboard(today)` → today's sales + count, 7-day series, cash, bank, receivable, payable, month profit, low stock, recent 5 |
| Reports (`db/reports/*.ts`) | `cashBook(range)`, `profitLoss(range)`, `balanceSheet(asOf)`, `trialBalance(asOf)`, `generalLedger({type, search})`, `salesReport({range, search, group})`, `purchaseReport(…)`, `stockSummary({range, categoryId, search})`, `stockLedger({productId, range})`, `stockLedgerAll({range, search})` |

- Services throw a typed `ValidationError { errors: [{ field: 'lines[0].qty', message: 'Only 4 in stock.' }] }`. Forms show these in coral `ErrorBanner`s above the footer.
- Report functions return raw integers (paisa or qty). The UI formats them with `lib/format.ts`.
- Use SQL aggregates (`sum`, `group by`) through Drizzle's `sql` helper for balances and reports. Never load all postings into JS.

### Phase 2: sync API (Django/DRF)
`POST /api/v1/sync/push/` (rows changed since the last sync, including soft deletes) and `GET /api/v1/sync/pull/?since=` . Last-write-wins per row on `updated_at`. Documents are immutable once synced (edits become reversals). Follow `django-drf-conventions`.

---

## 9. Project structure

### Mobile
```
mobile/
  app.config.ts
  src/
    navigation/ RootNavigator.tsx, MainTabs.tsx, types.ts, linking.ts
    theme/ tokens.ts, typography.ts
    components/ui/ (see §3.4)
    db/
      client.ts        (openDatabaseSync + drizzle() + PRAGMAs)
      schema.ts        (all sqliteTable definitions + relations)
      migrations/      (drizzle-kit output; migrations.js imported by useMigrations)
      seed.ts          (COA, walk-in customer, settings; seedDemo for dev)
      services/        ledger.ts (pure posting builders), invoices.ts, vouchers.ts, products.ts, parties.ts, settings.ts
      queries/         balances.ts, stock.ts, dashboard.ts
      reports/         cashBook.ts, profitLoss.ts, balanceSheet.ts, trialBalance.ts, generalLedger.ts, salesPurchase.ts, stockSummary.ts, stockLedger.ts
      hooks/           useCustomers.ts, useProducts.ts, useInvoices.ts … (useLiveQuery wrappers)
    drizzle.config.ts  (at mobile/ root)
    lib/ money.ts (toPaisa, fromPaisa), format.ts (fmt, fmtSigned, fmtParen, dateLabel, initials), queryClient.ts, backup.ts
    store/ reportRange.ts, drafts.ts
    features/
      home/        screens/HomeScreen.tsx, hooks/useDashboard.ts
      sales/       screens/SalesScreen.tsx
      purchases/   screens/PurchaseScreen.tsx
      invoices/    screens/InvoiceFormScreen.tsx, InvoiceDetailScreen.tsx, components/LineItemCard.tsx, TotalsCard.tsx, hooks/, api.ts, types.ts
      parties/     sheets/PartyPicker.tsx, QuickAddSheet.tsx, hooks/
      inventory/   screens/InventoryScreen.tsx, ProductFormScreen.tsx, sheets/ProductPicker.tsx
      vouchers/    screens/VoucherFormScreen.tsx, VoucherDetailScreen.tsx, sheets/AccountPicker.tsx, VoucherTypeChooser.tsx
      accounts/    screens/AccountsScreen.tsx, LedgerScreen.tsx, components/CoaTree.tsx
      reports/     screens/ReportScreen.tsx, reports/{CashBook,ProfitLoss,BalanceSheet,TrialBalance,GeneralLedger,SalesPurchase,StockSummary,StockLedger}.tsx, components/DateRangeBar.tsx
```

### Backend (phase 2 only)
```
backend/
  config/settings/{base,dev,prod}.py
  core/      (Business, TimeStampedModel, permissions IsBusinessMember, numbering service)
  parties/   (Customer, Supplier; signals create AR/AP sub-accounts)
  catalog/   (Category, Brand, Product, StockMovement; services.stock_on_hand)
  sales/     (Invoice kinds SI/SR)  purchases/ (PI/PR), or one `invoicing` app
  ledger/    (Account, Posting; services.post_invoice/post_voucher/post_opening; seed COA migration)
  vouchers/  (Voucher, VoucherLine)
  reports/   (read-only APIViews; pure query functions in reports/queries.py)
```

---

## 10. Non-functional requirements
- **Correctness:** Trial Balance debit = credit and Balance Sheet balanced at all times, enforced by a test on every posting service.
- **Performance:** dashboard and every report < 300 ms on a mid-range Android device with 10k invoices / 100k postings (indexes per §5, SQL aggregates only). Lists use FlashList with `limit/offset` paging.
- **Offline:** v1 is fully offline. All features work with no network.
- **Data safety:** every multi-table write runs in one transaction; WAL mode on; Settings › Backup exports the `.db` file and Restore replaces it (after confirmation, then the app reloads). Prompt for a backup weekly.
- **Migrations:** never edit an applied migration; every schema change goes through `drizzle-kit generate`. App start blocks on `useMigrations` and shows an error screen if a migration fails.
- **Security:** optional app PIN or biometric lock (`expo-local-authentication`) in Settings. Phase 2: JWT in `expo-secure-store`.
- **Accessibility:** 44px targets; text contrast ≥ 4.5:1 (ink text on amber, never white).
- **Platforms:** iOS 16+ and Android 9+, one neutral design (no platform-specific chrome beyond safe areas and the native date picker).

---

## 11. Build order for Claude Code

1. **Foundation:** Expo app (TS strict), fonts, theme tokens, React Navigation skeleton (tabs + stack), the UI kit in §3.4.
2. **Database:** `expo-sqlite` + Drizzle setup, `schema.ts`, `drizzle.config.ts`, first migration, `useMigrations` gate, seed (COA, walk-in, settings), `seedDemo()`, Drizzle Studio plugin.
3. **Posting engine:** pure `ledger.ts` builders for Opening/SI/SR/PI/PR/CRV/CPV/JV + Jest unit tests (every case balances; AR/AP/stock effects match §6).
4. **Services:** parties, products, invoices (numbering, stock validation, returns), vouchers, all transactional; tests against an in-memory SQLite DB.
5. **Queries & reports:** balances, stock on hand, dashboard, all §7.11 report functions; tests that the TB balances, the BS balances, and Stock Summary = Stock Ledger.
6. **Tabs:** Home, Sales, Purchase, Inventory, Accounts list screens on `useLiveQuery`.
7. **Forms:** InvoiceForm (+ pickers), ProductForm, VoucherForm, QuickAdd, plus detail screens and Ledger.
8. **Reports UI:** all 9 reports, DateRangeBar, drill-downs.
9. **Settings:** business setup / opening balances, allow negative stock, backup/restore, app lock.
10. **Polish:** toasts, empty and error states, PDF share (`expo-print` + `expo-sharing`), EAS profiles, RNTL smoke tests.
11. *(Phase 2)* Django sync backend.

Use the prototype file to check pixel details and copy at each step.

---

## 12. Acceptance criteria (sample)
- Saving an SI of Rs 21,600 with Rs 5,000 paid: stock falls by the sold qty; the customer ledger shows +21,600 and −5,000; Cash Book shows +5,000; Trial Balance still balances.
- A sale return created from an invoice is prefilled with the same party and lines, and adds stock back.
- Selling more than stock on hand is blocked with "{product}: only N in stock." unless allow-negative-stock is on.
- A JV with unequal sides cannot be saved; the balance bar reads "Off by Rs X".
- The Balance Sheet chip reads "Balanced" for any valid dataset.
- Changing the Sales Report range to "Today" shows only today's invoices, and the totals match the Home "Today's sales" card.
- Stock Summary closing for a product equals the closing on that product's Stock Ledger for the same range, and equals stock on hand when To = today.

---

## 13. Open questions
1. Is a business-setup onboarding flow (name, opening balances) wanted as a first-run screen? It is not in the prototype; it is assumed in §5.
2. Should invoices and vouchers be editable or deletable after saving, or only reversible (credit note or reversing JV)?
3. Should bank receipts and payments (Bank Receipt/Payment vouchers) be added alongside the cash ones?
4. Is a single device per shop enough for v1, or is multi-device sync (phase 2) needed sooner?
5. Is Urdu language / RTL support required?
