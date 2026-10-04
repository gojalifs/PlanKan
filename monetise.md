PlanKan SaaS Business Model & Monetization

1. Business Model

PlanKan menggunakan model Freemium + Subscription + Pay-as-you-go (PAYG).

Prinsip utama:

- Free plan digunakan untuk user acquisition dan product adoption.
- Subscription membayar akses ke fitur premium dan recurring value.
- PAYG digunakan terutama untuk resource yang mempunyai variable cost tinggi, terutama OCR/AI processing.
- Free plan harus cukup untuk membuat user merasakan value produk, tetapi tidak boleh menjadi unlimited AI service.
- Pricing dan quota harus configurable dari backend/database, bukan hardcoded di frontend.

Core positioning:

«PlanKan membantu user mencatat, mengatur, dan memahami keuangan mereka dengan bantuan automation dan AI.»

---

2. Pricing Tiers

Free

Rp0 / bulan

Target:

- User baru
- User yang hanya membutuhkan basic expense tracking
- Product discovery / acquisition

Features:

- Manual transaction
- Basic wallet
- Basic categories
- Basic dashboard
- Basic budgeting
- Basic reports
- Limited history/export
- 5 OCR/month

New-user bonus

User baru dapat tambahan OCR credit satu kali, misalnya:

+10 OCR welcome credit

Tujuannya supaya user baru dapat mencoba OCR beberapa kali tanpa membuat recurring AI cost terlalu besar.

Setelah welcome credit habis, user kembali ke quota normal.

Prinsip Free

Free bukan trial yang sengaja dibuat buruk.

Free harus genuinely usable.

Namun Free harus dibatasi pada variable-cost features.

---

3. Starter

Rp4.990 / bulan

Target:

«User ringan yang sudah mulai rutin menggunakan PlanKan.»

Features:

- Semua fitur Free
- Unlimited manual transactions
- More wallets
- More budgets
- Recurring transactions
- Advanced reports
- CSV/Excel export
- 50 OCR/month

Starter berfungsi sebagai entry-level paid subscription.

Harga sengaja dibuat rendah agar transisi:

"Free → Paid"

tidak terasa berat.

---

4. Plus

Rp14.990 / bulan

Target:

«User aktif yang ingin mengurangi pekerjaan manual.»

Features:

- Semua Starter
- 200 OCR/month
- Auto categorization
- Financial goals
- Advanced budgeting
- Spending trends
- Monthly AI summary
- Full historical analytics
- Advanced reports/export

Contoh AI insight:

«"Pengeluaran makanan bulan ini naik 18% dibanding bulan lalu."»

Plus mulai menjual automation dan insight, bukan sekadar storage/features.

---

5. Pro

Rp29.990 / bulan

Target:

«Power user yang ingin PlanKan menjadi financial assistant.»

Features:

- Semua Plus
- 500 OCR/month
- AI Financial Assistant
- AI spending analysis
- Cash-flow analysis
- Forecast
- Advanced financial insights
- Advanced AI features
- Priority processing
- Early access fitur baru

Contoh use case:

«"Berdasarkan pola pengeluaran 3 bulan terakhir, saldo wallet utama diperkirakan turun di bawah Rp1 juta sekitar tanggal 24."»

AI yang mempunyai variable cost tinggi sebaiknya dipusatkan pada tier Pro atau dibatasi menggunakan entitlement/usage policy.

---

6. Family

Rp59.990 / bulan

Target:

«Pasangan atau keluarga yang ingin mengelola keuangan bersama.»

Family bukan sekadar Pro × jumlah user.

Konsepnya menggunakan shared workspace.

Features:

- Up to 5 members
- Shared workspace
- Shared wallets
- Personal wallets
- Shared budgets
- Family financial goals
- Family reports
- Member permissions
- Pro-level features
- 1.500 OCR/month shared quota

Contoh:

Family Workspace
│
├── Shared Wallet
│   └── Tabungan Rumah
│
├── Shared Budget
│   └── Kebutuhan Rumah
│
├── Fajar
│   └── Personal Wallet
│
└── Partner
    └── Personal Wallet

Personal wallet tetap private sesuai permission.

---

7. PAYG / OCR Credits

Subscription quota tidak harus menjadi hard stop.

Jika user kehabisan OCR quota, mereka dapat membeli additional OCR credits.

Contoh pricing awal:

+100 OCR  = Rp5.000
+500 OCR  = Rp20.000

Pricing tersebut hanya starting hypothesis dan harus divalidasi berdasarkan actual AI cost.

PAYG terutama digunakan untuk:

- OCR
- High-volume AI processing
- Potentially other expensive AI features di masa depan

Jangan membuat setiap AI action menjadi credit.

User tidak boleh merasa seperti sedang menggunakan sistem "energy/stamina".

Subscription harus tetap terasa sebagai produk utama.

---

8. OCR Quota

Initial quota:

Plan| OCR/month
Free| 5
Starter| 50
Plus| 200
Pro| 500
Family| 1,500 shared

Free quota sengaja diturunkan dari konsep awal 20 OCR menjadi 5 OCR.

Reason:

Jika terdapat:

1,000 active users
800 Free
200 Paid

dan seluruh Free user menggunakan 20 OCR:

800 × 20
= 16,000 OCR/month

Sedangkan dengan 5 OCR:

800 × 5
= 4,000 OCR/month

Ini mengurangi potential AI cost sebesar 75%.

Tujuan Free OCR bukan memberikan banyak OCR.

Tujuannya adalah membuktikan value:

Take photo
    ↓
OCR
    ↓
Merchant/date/amount extracted
    ↓
User reviews
    ↓
Transaction saved

Setelah user memahami value tersebut, subscription/PAYG menjadi monetization path.

---

9. Unit Economics

Variable cost utama yang perlu dipantau:

OCR / Vision API
AI inference
Image storage
Database
Bandwidth
Email
Payment gateway fee
Other infrastructure

Setiap plan sebaiknya mempunyai cost ceiling.

Contoh konsep:

plan
  price
  monthly_ocr_limit
  ai_features
  wallet_limit
  budget_limit
  history_limit

Jangan menentukan quota hanya berdasarkan "berapa banyak fitur yang terlihat bagus".

Quota harus dikaitkan dengan:

Revenue
    ↓
Expected usage
    ↓
Variable cost
    ↓
Gross margin

Target awal yang ingin dicapai:

Gross margin sekitar 70-80%

Tetapi actual target harus dihitung menggunakan real production cost.

---

10. Subscription Entitlement

Jangan hardcode seperti:

if (plan == PRO) {
    ...
}

atau:

if (plan === "pro") {
    ...
}

Gunakan entitlement/capability system.

Contoh conceptual model:

subscription_plans

id
name
price
billing_period
active

plan_entitlements

plan_id
feature
value

Contoh:

PRO
ocr.monthly_limit = 500
ai.financial_assistant = true
ai.forecast = true
export.excel = true

Application layer dapat memiliki API seperti:

canUse(feature)
getLimit(feature)
getUsage(feature)
getRemaining(feature)

Dengan demikian pricing/quota dapat berubah tanpa perubahan besar pada frontend.

---

11. Usage Tracking

Buat usage tracking sebagai first-class domain.

Conceptual schema:

usage_records

id
user_id
workspace_id
feature
quantity
period
created_at

Contoh:

user_id     = 123
feature     = OCR
quantity    = 1
period      = 2026-09

Atau gunakan event-based usage jika nantinya dibutuhkan analytics yang lebih detail.

Usage harus dapat digunakan untuk:

- quota enforcement
- billing
- analytics
- cost analysis
- abuse detection

---

12. Quota Enforcement

Quota harus divalidasi di backend.

Frontend hanya menampilkan informasi.

Contoh:

GET /api/me/usage

Response conceptual:

{
  "ocr": {
    "used": 147,
    "limit": 200,
    "remaining": 53
  }
}

Backend harus tetap melakukan enforcement ketika OCR request dilakukan.

Jangan mempercayai quota yang dikirim oleh client.

Flow:

Client
  ↓
POST /ocr
  ↓
Backend authentication
  ↓
Resolve workspace/subscription
  ↓
Resolve entitlement
  ↓
Check usage
  ↓
Check quota
  ↓
Process OCR
  ↓
Record usage
  ↓
Return result

---

13. Important: Usage harus atomic

Untuk fitur berbiaya seperti OCR, hindari race condition.

Contoh:

User memiliki:

remaining = 1

Kemudian mengirim 3 request secara bersamaan.

Backend tidak boleh menghasilkan:

usage = -2

atau memproses semuanya tanpa kontrol.

Quota consumption sebaiknya transactional/atomic.

Conceptual:

BEGIN TRANSACTION

check remaining quota

reserve/consume usage

process/queue OCR

COMMIT

Implementasi detail dapat berbeda tergantung architecture.

---

14. Subscription Lifecycle

Subscription domain harus mendukung minimal:

trialing
active
past_due
cancelled
expired

Jangan menghapus subscription record ketika user cancel.

Simpan historical billing/subscription state.

Contoh:

subscriptions

id
workspace_id
plan_id
status
current_period_start
current_period_end
cancel_at_period_end
provider
provider_subscription_id
created_at
updated_at

---

15. Workspace-based Architecture

Family plan menunjukkan bahwa architecture sebaiknya tidak terlalu user-centric.

Gunakan konsep:

User
  ↓
Workspace
  ↓
Membership

Contoh:

User A
  ├── Personal Workspace
  └── Family Workspace

User B
  └── Family Workspace

Transaction, wallet, budget, dan resource lain idealnya memiliki:

workspace_id

sehingga personal/family/business mode dapat berkembang tanpa redesign besar.

---

16. Monetization Flow

Basic funnel:

Visitor
   ↓
Signup
   ↓
Free
   ↓
First transaction
   ↓
First OCR
   ↓
Repeated usage
   ↓
Quota reached / premium feature discovered
   ↓
Subscription
   ↓
Higher usage
   ↓
PAYG or plan upgrade

Important metric:

Activation

User harus mencapai meaningful action secepat mungkin.

Contoh activation event:

signup
+
create wallet
+
record first transaction

OCR bisa menjadi secondary activation event.

---

17. Product Positioning by Plan

Jangan menjual berdasarkan jumlah fitur saja.

Free

«"Catat uangmu."»

Starter

«"Mulai atur uangmu."»

Plus

«"Biar PlanKan membantu mencatat."»

Pro

«"Biar PlanKan membantu memahami keuanganmu."»

Family

«"Kelola keuangan bersama."»

Ini membantu menentukan feature placement.

---

18. Metrics

Internal admin dashboard sebaiknya memonitor:

Acquisition

signups
activated_users
MAU
DAU

Conversion

free_to_starter
free_to_plus
free_to_pro
free_to_family

Retention

D1
D7
D30
D90

Revenue

MRR
ARR
ARPU
paid_users
MRR_by_plan

Churn

monthly_churn
plan_churn
subscription_cancellation

AI economics

OCR_count
OCR_cost
AI_cost
AI_cost_per_user
AI_cost_per_paid_user
AI_cost / revenue

PAYG

credit_purchases
credit_revenue
credits_consumed
unused_credits

---

19. Example Scenario

Hypothetical:

1,000 MAU

800 Free
100 Starter
70 Plus
25 Pro
5 Family

Subscription revenue:

100 × 4,990  =   499,000
70 × 14,990  = 1,049,300
25 × 29,990  =   749,750
5 × 59,990   =   299,950
--------------------------------
Total        = 2,598,000 / month

PAYG revenue menjadi tambahan.

Angka ini bukan forecast, hanya contoh untuk menguji economics.

Yang harus dicari kemudian adalah:

MAU
→ paid conversion
→ ARPU
→ usage
→ AI cost
→ gross margin
→ retention
→ LTV

---

20. Implementation Priority

Jangan implement semua pricing feature sekaligus.

Recommended order:

Phase 1

Core product

Wallet
Transaction
Category
Budget
Dashboard
OCR

Phase 2

Usage infrastructure

usage_records
quota
entitlement
usage API
backend enforcement

Phase 3

Free + Starter

Free
Starter 4.990
subscription lifecycle

Phase 4

Plus

200 OCR
automation
AI monthly summary
financial goals

Phase 5

Pro

500 OCR
AI Financial Assistant
forecast
cash-flow analysis

Phase 6

PAYG

OCR credits
credit wallet
purchase
consumption
transaction history

Phase 7

Family

workspace
members
roles
shared wallets
shared budgets
family quota

---

21. Key Design Principles

1. Free must be useful.
2. Free must not become an unlimited AI service.
3. Subscription pays for product access/value.
4. PAYG pays for unusually high variable usage.
5. OCR quota must be enforced server-side.
6. Pricing/entitlements must be configurable.
7. Usage must be measurable.
8. AI cost must be measurable per user/plan.
9. Family should use workspace architecture.
10. Do not optimize pricing based on assumptions forever. Use production data.
11. Do not overcomplicate PAYG initially. Start with OCR credits.
12. Free OCR target: 5/month + one-time welcome bonus.
13. Pricing is a hypothesis and can change without requiring application architecture changes.

---

22. Main Open Questions for Coding/Product Agent

Agent should help evaluate these rather than assuming the values are final:

1. Is 5 OCR/month enough to demonstrate OCR value?
2. What should the one-time welcome OCR bonus be?
3. Is Starter at Rp4.990 economically viable after payment fees?
4. Should Starter have OCR at all, or should OCR become a Plus feature?
5. Are 50 / 200 / 500 / 1,500 OCR appropriate quotas?
6. What is the actual expected AI cost per OCR?
7. Should unused monthly OCR quota expire or roll over?
8. Should PAYG credits expire?
9. Should PAYG be available to Free users?
10. What happens to remaining quota after plan downgrade?
11. What happens to Family workspace when subscription expires?
12. Should subscription belong to "user" or "workspace"?
13. Which AI features belong to Plus vs Pro?
14. What usage constitutes activation?
15. What metrics should determine future pricing changes?
16. What is the minimum gross margin target?
17. How should abuse/rate limiting work for Free OCR?
18. Should OCR images be retained permanently, temporarily, or deleted after processing?

---

Initial Business Model Decision

For now, use this as the working hypothesis:

FREE       = Rp0
STARTER    = Rp4.990
PLUS       = Rp14.990
PRO        = Rp29.990
FAMILY     = Rp59.990

OCR:

FREE       = 5/month + one-time welcome bonus
STARTER    = 50/month
PLUS       = 200/month
PRO        = 500/month
FAMILY     = 1,500/month shared

PAYG:

+100 OCR   = Rp5.000
+500 OCR   = Rp20.000

Important: These prices and quotas are not hard business facts. They are the initial pricing hypothesis to validate through actual usage, AI cost, conversion, retention, and gross-margin data.

The technical architecture should therefore make plan limits, feature entitlements, usage tracking, and pricing configurable, so the business model can evolve without major application rewrites.
