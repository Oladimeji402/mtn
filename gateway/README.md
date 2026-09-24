# SIM gateway

Takes transfer jobs from the website, sends them from the client's own MTN SIMs, and reports the result.
The website never talks to a SIM directly. Three drivers:

| `DRIVER` | How it sends | Status |
|---|---|---|
| `mymtn-app` | Drives the **myMTN NG Android app** on an emulator or phone, one Android profile per SIM | **The one in use.** One real 100MB share done by hand (2026-09-24); driver tested against a scripted fake phone, and not yet end to end with a live SIM |
| `at-modem` | Dials MTN's gifting USSD on USB GSM modems | Tested against a fake modem only |
| `simulated` | Pretends | For trying the website without hardware |

## The myMTN app driver

Facts it relies on, checked by hand on myMTN NG 2.0.31:

- One myMTN login can **not** share from its "Added numbers" (Switch Account lists none), so every SIM needs
  its own login. Android profiles give that on one device: each profile has its own myMTN, all stay logged in,
  and switching profile needs no OTP (about 13s).
- Share Data asks for **no PIN and no confirmation**: tapping "Share 5 GB" sends. So before that tap the driver
  checks, from the screen, the sending number, the typed recipient, and the button's amount; after it, nothing
  but a "Successful" screen naming the same sender, recipient and amount counts as delivered.
- The home screen never goes idle (rotating banner), so it can't be read. The route is More tab (fixed
  position) -> Share tab -> Share Airtime/Data -> Share Now.

What each result becomes: a verified success screen is `success`; anything caught before the Share tap
(logged out, wrong account, app frozen three times, couldn't navigate) is `not_sent` and the order moves to
another SIM; not enough data (keeping MTN's 100MB) or a greyed-out amount is `insufficient_bundle`; anything
else after the tap is `unknown` and waits for an admin. Android's "isn't responding" dialog is answered with
**Wait** only, never "Close app". A screenshot of every non-success is saved in `state/screens/`.

### Setting up the phone (emulator or real Android device)

1. Install myMTN NG in the owner profile from the Play Store and log in with the first SIM's number.
2. For each further SIM, create a profile and give it myMTN (no Play Store login needed):
   ```bash
   adb shell pm create-user SIM2                                   # prints the new user id, e.g. 10
   adb shell pm install-existing --user 10 ng.mtn.nextgen
   adb shell settings put --user 10 secure user_setup_complete 1
   adb shell am switch-user 10                                     # then log in to myMTN on screen with the OTP
   ```
   An emulator image with Google Play allows only 4 profiles; for more, use an image without Play (or
   Redroid) and raise `fw.max_users`.
3. Turn off auto-update for myMTN in the Play Store: an app update can move buttons. When MTN forces one,
   update it, run `MYMTN_DRY_RUN=1 npm run try -- <sim> <your number> 100`, and only then go back to live.
4. In Admin > SIMs, add each number with transport "Gateway (myMTN app)".

The gateway finds which profile holds which number by itself (at start, and new profiles while running).
`npm run check` opens every profile and says which are logged in; it sends nothing.

### Adding a SIM later

New profile (step 2 above) -> log in to myMTN on it -> add the number in Admin > SIMs. The running gateway
picks the profile up within about 30 minutes; restart it to pick it up at once.

### When a SIM is logged out

The gateway stops offering that SIM and the admins get a notification ("SIM … stopped taking orders"). Log
the profile back in (from Admin > SIMs once the gateway side of "Log in" is built); the next check (within 30 minutes) brings it back and says so.

### Settings (in `.env`)

| Setting | Default | |
|---|---|---|
| `ADB_PATH` / `ANDROID_SERIAL` | `adb` / only device | which adb and which device |
| `MYMTN_PROFILES` | read from the phone | pin SIM -> profile, e.g. `{"08031234567":10}` |
| `MYMTN_DRY_RUN` | off | `1`: do every step and check, stop before the Share tap |
| `MYMTN_HEALTH_CHECK_HOURS` | 24 | how often each SIM's login is checked between orders (0 = never) |
| `MYMTN_PREP_TIMEOUT_MS` | 150000 | never tap Share if getting there took longer (the website's lease is 300s) |
| `MYMTN_RESULT_TIMEOUT_MS` | 60000 | how long to wait for the result screen |
| `MYMTN_MORE_TAB` | from screen size | `x,y` of the More tab if the layout differs |

## What it will and won't do

- It polls the website over HTTPS (outbound only: no ports to open, no public address needed).
- It only accepts jobs for SIMs it currently has online, and tells the website which those are (heartbeat).
  A SIM that isn't reporting takes no orders, so a gateway that is off or offline means customers are
  refused up front, never left waiting.
- **It never guesses.** A reply is only counted as a success if it matches a pattern you configured after
  seeing MTN's real wording. Anything else is reported as `unknown` and the order is held for an admin.
- **It never dials the same job twice.** The job is written to `state/in-flight.json` before dialling. If the
  gateway stops mid-transfer, the next start reports `unknown` and does not dial again, because the first
  attempt may already have sent the data.
- It never stores or asks for a SIM PIN (MTN's gifting needs none). Only the SIM's phone number is used.

## Hardware

MTN limits each SIM to **5GB of gifting per day** (and 10 free transfers a month), and every gift drains the
SIM's own bundle. With about 8 orders a day you need about **8 SIMs online at once**; the others are spares to
swap in as bundles run down.

| Option | Notes |
|---|---|
| USB GSM modems, one per SIM | Supported by `DRIVER=at-modem`. One small always-on computer + a powered USB hub. |
| Android device or emulator with myMTN | `DRIVER=mymtn-app`, see above. |
| Multi-SIM gateway box | Not implemented. Also the kind of hardware regulators associate with "SIM boxes": get MTN/NCC's view first. |

## Setup

```bash
cd gateway
npm install            # only needed for DRIVER=at-modem (installs serialport)
cp .env.example .env   # then edit
```

1. On the website, set `GATEWAY_API_TOKEN` (Vercel Production and Preview, and `.env.local`) to a long random
   value, e.g. `openssl rand -hex 32`. Put the **same** value in `gateway/.env` as `GATEWAY_TOKEN`.
2. Try it with no hardware first: `DRIVER=simulated`, then `npm start`. In Admin > SIMs add SIMs with the same
   numbers as `SIM_NUMBERS`; they show as Online.
3. Real SIMs: `DRIVER=at-modem` and `MODEMS='[{"sim":"0803...","port":"/dev/ttyUSB0"}]'`.
4. Keep it running and restart it after a crash or reboot: `pm2 start index.mjs --name sim-gateway` (or systemd).

## Before going live (the parts I could not test)

1. **One real transfer.** `npm run try -- <simNumber> <yourOwnMtnNumber> 100` sends 100MB and prints exactly what
   MTN replied. Check the USSD string is right for how the client transfers today (the default is MTN's published
   `*312*{recipient}*{amount}#`; `AMOUNT_FORMAT` chooses MB or GB), and that the modem returns the reply text
   readably.
2. **Set the reply patterns** (`SUCCESS_PATTERNS`, `LIMIT_PATTERNS`, `BUNDLE_PATTERNS`, `FAILED_PATTERNS`,
   regular expressions joined with `||`) from what you saw. Every real reply is also logged to
   `state/replies.log` for this. Until you do, every order is held as `unknown`.
3. **Ask MTN in writing** whether automated gifting from these SIMs is allowed and what happens at volume.
4. **Then**, in the database, activate the SIM plans and switch off their SMEData twins:
   `update data_plans set active = true where provider = 'sim';` after setting their real prices, and
   `update data_plans set active = false where provider = 'smedata' and id in (...)`.

## Protocol (the website side lives in `app/api/gateway/*`)

All calls are `POST`, JSON, with `Authorization: Bearer <GATEWAY_TOKEN>`. A wrong or missing token returns 401;
the endpoints reject everyone if the website's `GATEWAY_API_TOKEN` is unset or shorter than 24 characters.

| Call | Body | Response |
|---|---|---|
| `heartbeat` | `{ gatewayId, liveSims: ["0803…"], alerts?: [{ msisdn, reason }] }` | `{ ok, known }`. Marks those SIMs online (for 3 minutes) and runs housekeeping. |
| `claim` | `{ gatewayId, liveSims }` | `{ job: null }` or `{ job: { id, sourceMsisdn, recipientMsisdn, amountMb } }`. Leases the job for 5 minutes. |
| `report` | `{ jobId, outcome, message?, balanceMb? }` | `{ ok, action }`. `outcome` is `success`, `failed`, `limit_reached`, `insufficient_bundle`, `not_sent` or `unknown`. Repeating a report is harmless. |
| `login` | `{ gatewayId, action: "next" \| "update" \| "code", id?, status?, message? }` | Logging a SIM in to myMTN from Admin > SIMs: `next` hands out a waiting login; `update` reports `working`, `needs_code`, `succeeded` or `failed`; `code` hands over the code the admin typed, once. The gateway side of this is not built yet. |

What the website does with each outcome:

| Outcome | Job | SIM | Customer's order |
|---|---|---|---|
| `success` | succeeded | keeps its reservation | delivered |
| `failed` | failed | reservation released | refunded |
| `limit_reached` | failed | marked full for today | **moved to the next SIM** |
| `not_sent` | failed | reservation released, counters untouched | **moved to the next SIM** |
| `insufficient_bundle` | failed | data left set to 0 | **moved to the next SIM** |
| `unknown` (or a lapsed lease) | unknown | reservation kept | held; admins alerted; resolved in Admin > SIMs |

If no other SIM has room, the order is refunded and admins are alerted. A job nobody picks up within 15 minutes
is cancelled and moved to another SIM, or refunded. Automatic retries never happen for an unclear outcome.

## Tests

`npm test` runs 39 tests: reply classification, the AT modem driver against a scripted fake modem, the myMTN
app driver against a scripted fake phone (it fails if the driver ever taps Log Out, "Close app" or Share
Airtime, or taps Share after a failed check), and the run loop's safety properties above. The website's side is covered by an end-to-end run with this gateway and simulated SIMs.
