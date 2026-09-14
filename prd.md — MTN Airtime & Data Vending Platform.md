# Product Requirements Document (PRD)

## MTN Airtime & Data Vending Platform

**Document Type:** Product Requirements Document  
**Project Phase:** UI/UX Foundation  
**Status:** Initial Development  
**Primary Platform:** Responsive Web Application  
**Target Market:** Nigeria  

---

# 1. PRODUCT OVERVIEW

This product is a Nigerian airtime and data vending platform focused initially on MTN services.

Registered users will be able to:

- Create an account
- Login using username or email + password
- Fund an internal wallet
- Purchase MTN airtime
- Purchase MTN data
- Purchase for a Nigerian phone number
- View wallet balance
- View wallet funding history
- View airtime/data transaction history
- Monitor their daily and monthly data usage
- Receive transaction notifications

The platform will have an administrative dashboard that allows the business owner to:

- Monitor users
- Monitor transactions
- Monitor wallet activity
- View individual users
- Enable/disable users
- Monitor daily/monthly data usage
- Configure daily/monthly data limits

The initial product only supports MTN.

Do not add other networks or unrelated services unless explicitly requested later.

---

# 2. IMPORTANT DEVELOPMENT PHASE

This PRD currently describes the **UI/UX and frontend foundation phase**.

The application is being built from an empty folder.

The first implementation phase must NOT connect real external services.

Do NOT implement:

- Supabase
- Paystack
- VTU.ng
- MTN APIs
- Real authentication
- Real database
- Real wallet transactions
- Real payment processing
- Real webhooks
- Real email sending

Instead:

- Build the complete frontend
- Use realistic mock data
- Create mock service functions
- Create proper TypeScript types
- Build the architecture so the real backend can be integrated later

The UI must not be designed in a way that makes backend integration difficult.

---

# 3. RECOMMENDED TECHNOLOGY STACK

Use:

- Next.js
- App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Lucide React

Use where appropriate:

- React Hook Form
- Zod

Do NOT unnecessarily introduce:

- Redux
- Zustand
- Prisma
- tRPC
- GraphQL
- Firebase
- Bootstrap
- Material UI

The project should remain simple and maintainable.

---

# 4. FUTURE PRODUCTION STACK

The intended eventual production architecture is:

```text
Next.js
    ↓
Supabase
    ↓
PostgreSQL
    ↓
Server-side business logic
    ↓
Paystack
    ↓
VTU Provider
    ↓
MTN
```

The actual VTU provider may be VTU.ng or another provider depending on the client's final decision and API availability.

Do not hardcode the application tightly around a specific VTU provider during the UI phase.

Create an abstraction that allows the provider to be changed later.

---

# 5. CORE USER JOURNEY

The primary customer journey should be:

```text
Visit website
    ↓
Create account
    ↓
Verify email
    ↓
Login
    ↓
Dashboard
    ↓
Fund wallet
    ↓
Payment
    ↓
Wallet credited
    ↓
Buy MTN airtime/data
    ↓
Wallet balance checked
    ↓
Purchase processed
    ↓
VTU provider processes request
    ↓
Transaction status updated
    ↓
User sees result
    ↓
Transaction appears in history
```

The UI should clearly distinguish:

- Payment
- Wallet funding
- Wallet deduction
- Telecom fulfilment
- Final transaction status

Do not make these look like one instantaneous event.

---

# 6. DESIGN PRINCIPLES

The platform is handling money.

The UI must therefore prioritize:

1. Trust
2. Clarity
3. Simplicity
4. Speed
5. Reliability
6. Transparency

The application should look like a legitimate Nigerian fintech/telecom service.

Avoid generic AI-generated design.

Do NOT use:

- Excessive gradients
- Glassmorphism
- Giant floating cards
- Excessive shadows
- Excessive border radius
- Neon effects
- Decorative blobs
- Random illustrations
- Fake statistics
- Fake testimonials
- Fake awards
- Fake trust badges
- Fake customer counts

Use:

- Strong typography
- Clean spacing
- Subtle borders
- Restrained surfaces
- Clear hierarchy
- Professional forms
- Clear status indicators

MTN yellow can be used as an accent.

Do not make the entire interface bright yellow.

---

# 7. MOBILE-FIRST DESIGN

The platform must be mobile-first.

Primary target widths:

- 320px
- 360px
- 375px
- 390px
- 414px
- 430px

Also support:

- Tablet
- Desktop

Do not simply shrink desktop layouts.

The mobile purchase flow must be especially easy.

Buttons should have comfortable touch targets.

Inputs should be easy to use.

Transaction tables should transform into cards or another mobile-friendly layout.

---

# 8. APPLICATION ROUTES

Create the following routes.

## Public

```text
/
 /login
 /signup
 /forgot-password
 /reset-password
 /verify-email
```

## Customer

```text
/dashboard
/dashboard/wallet
/dashboard/wallet/history
/dashboard/airtime
/dashboard/data
/dashboard/transactions
/dashboard/transactions/[id]
/dashboard/notifications
/dashboard/profile
/dashboard/support
```

## Admin

```text
/admin/login
/admin
/admin/users
/admin/users/[id]
/admin/transactions
/admin/transactions/[id]
/admin/settings
```

Adjust the structure if a cleaner Next.js App Router organization is appropriate.

---

# 9. PUBLIC HOMEPAGE

The homepage should be concise and conversion-focused.

Primary message:

**Buy MTN Airtime & Data Easily**

Sections:

- Header
- Hero
- How it works
- Airtime/data benefits
- Trust/security information
- FAQ
- CTA
- Footer

Primary CTAs:

- Create Account
- Login

Do not invent statistics.

Do not claim:

- "Trusted by millions"
- "Nigeria's #1"
- "99.99% uptime"

unless real information is provided.

---

# 10. SIGNUP

Route:

```text
/signup
```

Fields:

- Username
- Email
- Password
- Confirm password

Requirements:

- Password visibility toggle
- Password requirements
- Validation
- Error states
- Loading state
- Success state
- Link to login

Mock submission only.

---

# 11. LOGIN

Route:

```text
/login
```

Login must support:

- Email OR username
- Password

Include:

- Show/hide password
- Forgot password
- Loading state
- Invalid credentials state
- Signup link

Mock authentication only.

---

# 12. PASSWORD RESET

Create:

```text
/forgot-password
/reset-password
```

Forgot password:

- Email field
- Submit
- Success
- Error

Reset password:

- New password
- Confirm password
- Password strength
- Success

---

# 13. EMAIL VERIFICATION

Create:

```text
/verify-email
```

Show:

- Verification message
- Masked email
- Resend verification
- Countdown
- Success state
- Error state

Mock only.

---

# 14. CUSTOMER APPLICATION SHELL

Desktop:

- Sidebar
- Header
- Main content
- User menu
- Notifications

Mobile:

- Compact header
- Mobile navigation
- Bottom navigation if appropriate

Navigation:

- Dashboard
- Wallet
- Buy Airtime
- Buy Data
- Transactions
- Notifications
- Profile
- Support

---

# 15. CUSTOMER DASHBOARD

The dashboard should prioritize actions.

Show:

## Wallet

Example mock balance:

**₦12,500.00**

Actions:

- Fund Wallet
- Buy Airtime
- Buy Data

## Data Usage

Daily:

```text
3.2GB / 5GB
```

Monthly:

```text
18.7GB / 50GB
```

Show:

- Used
- Remaining
- Progress

Example:

```text
1.8GB remaining today
31.3GB remaining this month
```

These are mock values.

---

# 16. WALLET

The platform uses an internal customer wallet.

Users should be able to:

- View wallet balance
- Fund wallet
- Use wallet to purchase airtime
- Use wallet to purchase data
- View wallet history

The wallet is an important core feature.

---

# 17. FUND WALLET

Route:

```text
/dashboard/wallet
```

Show:

Current wallet balance:

```text
₦12,500.00
```

Primary action:

**Fund Wallet**

Funding form:

- Amount
- Quick amount buttons

Suggested mock quick amounts:

```text
₦500
₦1,000
₦2,000
₦5,000
₦10,000
₦20,000
```

Allow custom amounts.

The minimum funding amount should be represented as configurable mock data.

---

# 18. FUND WALLET CONFIRMATION

Before payment, show:

```text
Amount to fund
₦5,000

Current balance
₦12,500

Expected balance
₦17,500
```

CTA:

**Continue to Payment**

Do NOT show the wallet as already funded.

---

# 19. WALLET FUNDING STATES

Design all states:

1. Funding form
2. Payment initiated
3. Payment loading
4. Payment pending
5. Payment verification
6. Payment successful
7. Payment failed
8. Payment delayed/problem

Success example:

```text
Wallet funded successfully

₦5,000 has been added to your wallet.

New balance: ₦17,500
```

These are mock states.

---

# 20. IMPORTANT WALLET RULE

The frontend must NEVER independently decide that a wallet has been funded.

Future production flow:

```text
User requests funding
        ↓
Payment initiated
        ↓
Paystack
        ↓
Server verifies payment
        ↓
Wallet credited
        ↓
Database updated
        ↓
User sees success
```

Do not implement this yet.

---

# 21. WALLET HISTORY

Route:

```text
/dashboard/wallet/history
```

Show:

- Reference
- Type
- Amount
- Direction
- Status
- Date/time

Types:

- Wallet funding
- Airtime purchase
- Data purchase
- Refund
- Future wallet adjustment

Example:

```text
+₦5,000
Wallet funding
Successful

-₦1,000
MTN Data
Successful

-₦500
MTN Airtime
Successful
```

Positive/negative states should not rely only on color.

---

# 22. WALLET TRANSACTION DETAILS

Show:

- Reference
- Transaction type
- Amount
- Previous balance
- Balance after transaction
- Status
- Date
- Time

For purchases also show:

- Network
- Phone number
- Data plan or airtime amount

---

# 23. BUY AIRTIME

Route:

```text
/dashboard/airtime
```

Fields:

- MTN phone number
- Amount

Quick amounts:

```text
₦100
₦200
₦500
₦1,000
₦2,000
₦5,000
```

Allow custom amount.

Validate:

- Nigerian phone number
- Amount

Purchase summary:

```text
Network
MTN

Phone number
080XXXXXXXX

Amount
₦1,000

Wallet balance
₦12,500

Balance after purchase
₦11,500
```

CTA:

**Confirm Purchase**

---

# 24. BUY DATA

Route:

```text
/dashboard/data
```

Fields:

- MTN phone number
- Data plan

Use MOCK data plans.

Example:

```text
500MB
1GB
2GB
3GB
5GB
10GB
```

Each plan should show:

- Data amount
- Validity
- Price

Example:

```text
1GB
30 days
₦350
```

IMPORTANT:

These are mock values.

Do not present them as confirmed MTN prices.

The real plans will eventually come from the VTU provider API.

---

# 25. DATA PLAN ARCHITECTURE

Do not hardcode data plans into UI components.

Create mock data such as:

```text
lib/mock/data-plans.ts
```

and a mock service such as:

```text
getDataPlans()
```

The future implementation should be able to replace this with an API request.

---

# 26. WALLET PURCHASE FLOW

Before confirming an airtime/data purchase, show:

```text
Wallet balance
₦12,500

Purchase amount
₦1,000

Balance after purchase
₦11,500
```

CTA:

**Confirm Purchase**

The backend will eventually verify the balance before allowing the purchase.

---

# 27. INSUFFICIENT BALANCE

Create a polished insufficient-balance state.

Example:

```text
Wallet balance
₦300

Purchase
₦1,000

Insufficient wallet balance.

You need ₦700 more to complete this purchase.
```

Actions:

**Fund Wallet**

**Cancel**

Fund Wallet should lead directly into the funding flow.

---

# 28. DATA LIMITS

Business limits:

## Daily

Maximum:

**5GB**

## Monthly

Maximum:

**50GB**

The frontend should display these limits.

Example:

```text
Daily
3.2GB / 5GB
1.8GB remaining
```

```text
Monthly
18.7GB / 50GB
31.3GB remaining
```

---

# 29. DATA LIMIT STATES

Design:

Normal:

```text
3.2GB / 5GB
```

Near limit:

```text
4.6GB / 5GB
```

Limit reached:

```text
5GB / 5GB
```

Monthly limit reached:

```text
50GB / 50GB
```

Also design:

```text
Purchase exceeds remaining allowance
```

Example:

```text
You have 1GB remaining today.
Please select a smaller data plan.
```

IMPORTANT:

Do NOT enforce these rules on the frontend.

The backend must become the source of truth.

---

# 30. TRANSACTION LIFECYCLE

The UI must support:

```text
Pending
Processing
Successful
Failed
Refunded
```

A payment being successful does not necessarily mean the telecom purchase has completed.

The UI must be capable of showing:

```text
Payment successful

Your MTN data purchase is being processed.
```

rather than immediately claiming delivery.

---

# 31. TRANSACTION HISTORY

Route:

```text
/dashboard/transactions
```

Show:

- Reference
- Type
- Network
- Phone number
- Data plan
- Amount
- Status
- Date/time

Filters:

- All
- Airtime
- Data
- Successful
- Processing
- Pending
- Failed
- Refunded

Include search.

Include date filtering if it improves the UX.

Desktop:

Use a table.

Mobile:

Use transaction cards/list items.

---

# 32. TRANSACTION DETAILS

Route:

```text
/dashboard/transactions/[id]
```

Show:

- Reference
- Type
- Network
- Phone number
- Amount
- Data plan
- Status
- Date
- Time

Actions:

- Copy reference
- Download receipt
- Share receipt

These can be mocked.

---

# 33. NOTIFICATIONS

Route:

```text
/dashboard/notifications
```

Notification examples:

- Airtime purchase successful
- Data purchase successful
- Data purchase failed
- Wallet funded
- Wallet funding failed
- Daily limit warning
- Monthly limit warning
- Security notification

Support:

- Read/unread
- Mark as read
- Empty state

---

# 34. PROFILE

Route:

```text
/dashboard/profile
```

Sections:

Personal information:

- Username
- Email

Security:

- Change password

Account:

- Status

Create proper form states.

---

# 35. SUPPORT

Route:

```text
/dashboard/support
```

Include:

- WhatsApp support placeholder
- Email support placeholder
- FAQ

Do NOT invent real contact details.

---

# 36. ADMIN APPLICATION

The admin interface should feel like an operations dashboard.

It should NOT simply copy the customer dashboard.

Routes:

```text
/admin/login
/admin
/admin/users
/admin/users/[id]
/admin/transactions
/admin/transactions/[id]
/admin/settings
```

---

# 37. ADMIN LOGIN

Fields:

- Email/username
- Password

Include:

- Loading
- Error
- Logout UI

Mock only.

---

# 38. ADMIN DASHBOARD

Show:

- Total users
- Active users
- Transactions today
- Successful transactions
- Failed transactions
- Pending transactions
- Airtime sales
- Data sales
- Wallet funding activity

Use fictional development data.

Do not present mock statistics as real business figures.

---

# 39. ADMIN USER MANAGEMENT

Route:

```text
/admin/users
```

Show:

- Username
- Email
- Status
- Joined date
- Transaction count
- Wallet balance
- Daily data usage
- Monthly data usage

Actions:

- View user
- Enable user
- Disable user

Include:

- Search
- Status filter

Destructive actions require confirmation.

---

# 40. ADMIN USER DETAILS

Route:

```text
/admin/users/[id]
```

Show:

- Username
- Email
- Account status
- Registration date
- Wallet balance
- Daily usage
- Monthly usage
- Total transactions
- Wallet activity
- Transaction history

The admin should be able to understand the user's activity quickly.

---

# 41. ADMIN TRANSACTIONS

Route:

```text
/admin/transactions
```

Show:

- Reference
- User
- Type
- Phone number
- Amount
- Status
- Date
- Action

Filters:

- Search
- Status
- Type
- Date

Mobile must remain usable.

---

# 42. ADMIN TRANSACTION DETAILS

Route:

```text
/admin/transactions/[id]
```

Show:

- Reference
- User
- Phone number
- Network
- Type
- Data plan
- Amount
- Status
- Created date
- Completed date
- Provider reference placeholder

The UI should eventually be capable of displaying provider transaction information.

---

# 43. ADMIN WALLET MONITORING

Admin should be able to see:

- User wallet balance
- Total wallet funding
- Total purchases
- Recent wallet activity

Separate transaction types:

- Wallet funding
- Airtime purchase
- Data purchase
- Refund

Do NOT give the admin an arbitrary "change wallet balance" button.

If manual wallet adjustments are needed in a future phase, they must include:

- Amount
- Reason
- Admin identity
- Audit record
- Confirmation

Do not implement manual wallet adjustment in this UI phase.

---

# 44. ADMIN SETTINGS

Route:

```text
/admin/settings
```

Configurable values:

Daily data limit:

```text
5GB
```

Monthly data limit:

```text
50GB
```

Include:

- Edit
- Save
- Unsaved changes
- Loading
- Success
- Error

Mock only.

---

# 45. MOCK DATA ARCHITECTURE

Do not scatter mock data throughout the application.

Create:

```text
lib/
  mock/
    users.ts
    transactions.ts
    wallet.ts
    data-plans.ts
    notifications.ts
    usage.ts

  services/
    users.ts
    transactions.ts
    wallet.ts
    data-plans.ts
    notifications.ts
    usage.ts
```

Use mock service functions such as:

```text
getUser()
getWallet()
getWalletHistory()
getDataPlans()
getTransactions()
getTransaction()
getUsage()
getNotifications()
getUsers()
getAdminTransactions()
```

The actual implementation can return mock data.

Later these services can be replaced by real backend calls.

---

# 46. TYPESCRIPT TYPES

Create proper types for:

```text
User
Transaction
Wallet
WalletTransaction
DataPlan
Notification
Usage
PurchaseRequest
PurchaseStatus
PaymentStatus
AdminUser
```

Avoid unnecessary `any`.

---

# 47. BUSINESS LOGIC BOUNDARY

The frontend must NOT be the authority for:

- Payment success
- Wallet balance
- Wallet crediting
- Wallet deductions
- Data limits
- User permissions
- Admin permissions
- Account status
- VTU delivery
- Transaction success

The backend will eventually control these.

The frontend only displays the state returned by the backend.

---

# 48. SECURITY PRINCIPLES

Even during UI development:

DO NOT:

- Store fake production credentials
- Put API secrets into frontend code
- Pretend localStorage is secure authentication
- Pretend frontend limit checks are security
- Implement fake payment verification
- Implement fake VTU authentication

Keep mock behavior clearly separated.

---

# 49. COMPONENT ARCHITECTURE

Create reusable components.

Suggested:

```text
components/
  ui/
  layout/
  auth/
  dashboard/
  wallet/
  airtime/
  data/
  transactions/
  notifications/
  admin/
```

Examples:

```text
AppSidebar
MobileNavigation
PageHeader
WalletBalance
FundWalletForm
QuickAction
UsageProgress
TransactionStatusBadge
TransactionCard
TransactionTable
DataPlanCard
PurchaseSummary
EmptyState
ErrorState
LoadingSkeleton
ConfirmDialog
```

Avoid huge page components.

---

# 50. FORMS

Every form should have:

- Label
- Placeholder
- Validation
- Error message
- Loading state
- Disabled state
- Success state where applicable

Phone number validation should support Nigerian numbers.

---

# 51. TOASTS

Use a consistent toast system.

Use toasts for:

- Success
- Minor errors
- Copy reference
- Mark notification read
- Profile update

Use dialogs for destructive actions.

---

# 52. LOADING STATES

Create skeletons/loading states for:

- Dashboard
- Wallet
- Transactions
- Transaction details
- Data plans
- Admin users
- Admin transactions

Do not make every state a spinner.

---

# 53. EMPTY STATES

Create intentional empty states.

Examples:

```text
No transactions yet.

No wallet activity.

No notifications.

No users found.

No matching transactions.

No data plans available.
```

Where appropriate, tell the user what they can do next.

---

# 54. ERROR STATES

Create clear user-friendly states for:

- Network error
- Payment failure
- Wallet funding failure
- Airtime purchase failure
- Data purchase failure
- Pending transaction
- Invalid phone number
- Invalid amount
- Insufficient wallet balance
- Daily limit reached
- Monthly limit reached
- Session expired
- Disabled account

Never expose technical stack traces.

---

# 55. SUCCESS STATES

Create polished success experiences for:

- Account created
- Email verified
- Wallet funded
- Airtime purchased
- Data purchased
- Password changed
- Profile updated

Animations should be subtle.

---

# 56. ACCESSIBILITY

Implement:

- Semantic HTML
- Proper labels
- Keyboard navigation
- Focus states
- Accessible dialogs
- Accessible buttons
- Good contrast
- Form error association

---

# 57. SEO

Configure appropriate metadata for the public homepage.

Do not invent a final company name.

Use an obvious temporary placeholder if the name has not yet been supplied.

---

# 58. NO FAKE BUSINESS INFORMATION

Do not invent:

- Company registration details
- CAC details
- Address
- Phone numbers
- Emails
- Customer numbers
- Revenue
- Reviews
- Testimonials
- Awards
- Certifications
- Partnerships

Use placeholders.

---

# 59. FUTURE PAYMENT ARCHITECTURE

The UI should be designed for:

```text
User
 ↓
Fund Wallet
 ↓
Paystack
 ↓
Server-side payment verification
 ↓
Wallet credited
 ↓
Wallet balance updated
```

For purchases:

```text
User
 ↓
Select airtime/data
 ↓
Backend validates request
 ↓
Backend checks wallet balance
 ↓
Backend checks daily/monthly limits
 ↓
Wallet transaction created
 ↓
VTU provider request
 ↓
Provider processes request
 ↓
Provider webhook/status
 ↓
Transaction finalized
 ↓
User notified
```

Do not implement these backend operations yet.

---

# 60. IMPORTANT FINANCIAL CONSISTENCY REQUIREMENT FOR FUTURE BACKEND

When backend development begins, wallet operations must NOT be implemented as simple frontend balance manipulation.

The future backend must account for:

- Atomic wallet operations
- Duplicate payment protection
- Idempotency
- Payment verification
- Transaction references
- VTU transaction status
- Failed fulfilment
- Refund handling
- Negative balance prevention
- Concurrent purchases
- Auditability

This PRD does not require implementing those systems yet.

The UI should simply be designed to support their eventual states.

---

# 61. DO NOT ADD FEATURES OUTSIDE SCOPE

Do NOT add:

- Referral system
- Loyalty points
- Crypto
- Betting
- Cable TV
- Electricity
- Bills payment
- Multiple networks
- Marketplace
- Chat
- Rewards
- Subscriptions

unless explicitly requested later.

The current product is:

```text
MTN Airtime
MTN Data
Wallet
Transactions
Data Limits
User Management
Admin Monitoring
```

Keep it focused.

---

# 62. PROJECT QUALITY STANDARD

This is client work.

The final UI should not look like a starter template.

It should look like a product that is ready to be connected to a real backend.

Prioritize:

1. Excellent mobile UX
2. Trust
3. Clear purchase flow
4. Clear wallet flow
5. Clear transaction states
6. Clear data-limit states
7. Good admin monitoring
8. Maintainable code
9. Accessibility
10. Performance

---

# 63. RESPONSIVENESS QA

Before considering the UI complete, inspect:

- 320px
- 360px
- 375px
- 390px
- 414px
- 430px
- Tablet
- Desktop

Pay special attention to:

- Navigation
- Wallet
- Fund Wallet
- Airtime purchase
- Data purchase
- Transaction history
- Transaction details
- Admin tables

---

# 64. FINAL QA

Before completing the UI phase:

Run:

```bash
npm run build
```

Also run the project's lint/type checks.

Verify:

- All routes work
- No broken links
- No TypeScript errors
- No lint errors
- No obvious console errors
- Forms work
- Loading states work
- Empty states work
- Error states work
- Success states work
- Responsive layouts work

---

# 65. FINAL DELIVERABLE

At the end of this phase, provide a concise report containing:

1. Stack used
2. Routes created
3. Components created
4. Mock data created
5. Mock service layer created
6. Important UX decisions
7. Assumptions
8. Items intentionally left for backend integration

---

# 66. CRITICAL INSTRUCTION

DO NOT IMPLEMENT THE BACKEND DURING THIS PHASE.

DO NOT CONNECT:

- Supabase
- Paystack
- VTU.ng
- MTN API

The purpose of this phase is to create the complete, polished frontend/UI foundation.

The backend will be implemented separately after the UI has been reviewed and approved.

Build the application carefully, not quickly.

The goal is not to produce many screens.

The goal is to produce a coherent, trustworthy, maintainable product experience.