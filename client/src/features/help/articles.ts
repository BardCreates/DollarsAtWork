/**
 * The help guide. Every article describes what the app does today; if a screen changes, change its article
 * in the same commit.
 *
 * Bodies use a small markup (see HelpContent): paragraphs separated by a blank line, "## " for a heading,
 * "- " for a list item, **bold** and [a link](/path).
 */

export type HelpSection = 'Getting started' | 'Your plan' | 'Savings, debt and investing' | 'Dashboard' | 'Tools and what-ifs' | 'Account and billing';

export const HELP_SECTIONS: HelpSection[] = [
  'Getting started',
  'Your plan',
  'Savings, debt and investing',
  'Dashboard',
  'Tools and what-ifs',
  'Account and billing',
];

export interface HelpArticle {
  slug: string;
  title: string;
  section: HelpSection;
  /** One sentence shown in lists and search results. */
  summary: string;
  /** Extra words people might search for that don't appear in the text. */
  keywords?: string;
  body: string;
}

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: 'getting-started',
    title: 'How Dollars at Work works',
    section: 'Getting started',
    summary: 'One monthly plan, three modules, and a dashboard that shows where it all leads.',
    keywords: 'start begin overview tour setup welcome walkthrough first steps',
    body: `Dollars at Work turns this month's plan into a picture of your future. You tell it what you take home and where each dollar goes. It shows you your debt-free date, when each goal is reached, and what your net worth could be up to 40 years from now.

## How the pieces fit
- **Plan**: enter your monthly take-home pay and split it into categories. Three of them are built in: Savings, Debt and Investments.
- **Savings, Debt and Invest**: each takes its monthly amount from Plan and puts it to work on your goals, your debts and your accounts. You can change that amount on the page itself.
- **Assets**: your home, car and other things you own, so your net worth counts them.
- **Dashboard**: your net worth today and where your plan takes it. Check in once a month to keep the numbers true.
- **What if**: try a different plan and compare it with yours, without changing anything.
- **Tools**: quick calculators for one-off questions.

## Your first five minutes
When you sign up, the walkthrough at [Set up your plan](/welcome) asks three things: your income, how much goes to Savings, Debt and Investments, and (optionally) a debt, a goal, an account or your home. You can skip any step and change everything later.

After that, add your everyday categories (rent, groceries and so on) on [Plan](/plan) until Remaining reaches $0. Then add the rest of your debts, goals, accounts and assets on their pages.

## Estimates, not promises
Every projection is an estimate based on the numbers you enter and the returns you assume. It isn't financial advice. Updating your balances once a month keeps the estimates close to reality.`,
  },
  {
    slug: 'hints',
    title: 'Hints: hide them or bring them back',
    section: 'Getting started',
    summary: 'Each page shows a short hint the first time. Close one, hide them all, or turn them back on in Profile.',
    keywords: 'tips tutorial guide tour turn off disable enable show again annoying',
    body: `The first time you open a page, a short hint at the top explains what the page is for and what to try first.

- **Got it** (or the X) closes that hint for good.
- **Hide all hints** turns every hint off at once.
- **Read the guide** opens the matching article here in Help.

## Turning hints back on
Go to [Profile & billing](/profile) and switch on **Show hints**. If it's already on but you closed some hints, press **Show the hints I closed**. Either way, every hint comes back.

Your hint settings are saved to your account, so they follow you to any device you sign in on.`,
  },
  {
    slug: 'plan',
    title: 'Your monthly plan',
    section: 'Your plan',
    summary: 'Enter your take-home pay and give every dollar a job with categories.',
    keywords: 'budget income categories remaining allocate allocation over-allocated percent drag reorder delete undo rent groceries donut',
    body: `The [Plan](/plan) page is where everything starts. Enter your **monthly take-home income** (your pay after taxes; if it varies, use a typical month), then split it into categories.

## Categories
- Add a category with a name and an amount, like Rent or Groceries.
- Type an amount in dollars (500) or as a percent of income (10%). It's always saved as dollars.
- Drag a category by its handle to reorder it. Tap the color dot to change its color.
- Delete a category with the bin icon. You get a few seconds to press **Undo**.
- A plan can have up to 100 categories.

## Savings, Debt and Investments
These three are built in. They have a lock icon: you can change their amount and their position, but you can't rename or delete them. Each one has a link to its own page, where that monthly amount goes to work.

## Remaining
**Remaining = income minus every category.** It's green while money is still unassigned and shows "Every dollar has a job" at $0. If your categories add up to more than your income, it turns red and says "Over-allocated by". You can still save, but the dashboard will warn you that its projections are optimistic.

## Changing your income
When you change your income, category amounts stay the same and Remaining moves. If you'd rather keep the same proportions, press **Scale all to new income**.

## Saving
There's no save button. Each change saves when you leave the box or press Enter. Press Escape to undo a change you're still typing. The top of the page shows "Saving…" or "All changes saved".`,
  },
  {
    slug: 'move-a-dollar',
    title: 'Move a dollar and the cost of a habit',
    section: 'Your plan',
    summary: 'See what each change to your plan does to your debt-free date and your net worth, as you type.',
    keywords: 'impact panel compare from here if invested habit 10 years net worth sooner later',
    body: `Beside your categories on [Plan](/plan), the **Move a dollar** panel shows two numbers: your **debt-free date** and your **net worth in 10 years**.

Change any amount and watch them move, before you even leave the box. Under each number you'll see how far it moved: months sooner or later, and dollars more or less.

## What it compares against
The panel compares your plan with how it looked when you opened the page. Press **Compare from here** to make the current numbers the new starting point.

If you free up money but don't give it to Debt, Savings or Investments, the panel reminds you: money left in Remaining isn't projected.

## Cost of a habit
Each of your own categories (not the built-in three) shows a line like "≈ $43,000 in 10 years if invested". That's what the monthly amount could grow to over 10 years if it were invested instead. It uses your investment accounts' expected return, or 7% a year if you haven't added any. It's an estimate, not advice.

On phones the panel sits at the top of the page, so it stays in view while you scroll.`,
  },
  {
    slug: 'savings',
    title: 'Savings goals',
    section: 'Savings, debt and investing',
    summary: 'Turn your Savings amount into goals that fill in order or by fixed shares.',
    keywords: 'goal emergency fund target date on track priority percent share apy interest vacation',
    body: `The [Savings](/savings) page puts your Savings amount from Plan to work on goals. The banner at the top shows that amount; type a new one right there and it saves to your plan's Savings category. If that puts your categories over your income, the banner says so; take it from another category on [Plan](/plan).

## Adding a goal
- **Name**: what you're saving for.
- **Target**: how much you want to have.
- **Saved so far**: what's in the account today. Update it whenever the real balance changes.
- **Target date** (optional): you'll see whether you're on track.
- **APY** (optional): the yearly interest the account pays, like 4.5.

You can have up to 50 goals. No goals yet? The page suggests an **emergency fund** of 3 or 6 months of the expenses in your plan.

## Priority or Percent
- **Priority** fills goals from the top down. Drag goals to change the order.
- **Percent** gives each goal a fixed share of your monthly savings. If the shares don't add up to 100%, they're scaled to use the whole amount.

## On track?
Goals with a target date show **On track**, or **Needs about $X/month more** if the current pace won't get there in time.

## When a goal is full
Its money moves on: to the next goal, or once every goal is full, to wherever you chose under **Assumptions** on the Dashboard (Investments by default). The "When a goal is full" list says exactly where each goal's money goes and when.

## Timeline
The **Timeline** tab charts every goal and lists the month each one is reached.`,
  },
  {
    slug: 'debt',
    title: 'Paying off debt',
    section: 'Savings, debt and investing',
    summary: 'Add your debts and see your debt-free date with snowball, avalanche or your own order.',
    keywords: 'debt free date snowball avalanche custom apr minimum payment interest schedule credit card loan mortgage student auto medical payoff',
    body: `The [Debt](/debt) page uses your Debt amount from Plan to pay everything off. The banner at the top shows that amount; type a new one there and it saves to your plan's Debt category (the banner warns if your categories then add up to more than your income).

## Adding a debt
- **Name** and **Type** (credit card, auto loan, student loan, mortgage, medical or other).
- **Balance**: what you owe today.
- **APR**: the yearly interest rate, like 19.99.
- **Minimum payment**: what you must pay each month. For a mortgage, enter the principal and interest only, not the escrow part (taxes and insurance), since that never touches the balance.
- **Minimum only**: on by default for a mortgage. The debt is paid on its own schedule and still counts against your net worth, but your extra money skips it and "debt-free" means everything else. Turn it on for any long loan you'd rather not snowball, or off to throw your extra at the mortgage too.

You can have up to 50 debts. If your Debt amount doesn't cover all the minimums, you'll see a warning; raise the amount in Plan.

## How payments are worked out
Every month, each debt gets its minimum. Whatever is left of your Debt amount goes to one target debt, marked **Getting extra**. When a debt is paid off, its money stays in your Debt amount and moves to the next debt. Once everything is paid, that money goes where you chose under **Assumptions** on the Dashboard.

## Snowball, Avalanche or Custom
- **Snowball**: smallest balance first, for quick wins.
- **Avalanche**: highest APR first, which costs the least interest.
- **Custom**: your own order. Drag the debts to set it.

## The numbers
- **Debt-free**: the month your last debt is paid off. A minimum-only mortgage doesn't count, so you'll see "Debt-free, except…" with its name.
- **Interest you'll pay**: total interest from now until then.
- **Saved vs minimums only**: how much interest (and time) your plan saves compared with paying only the minimums.

The **Schedule** tab shows every month's payment, interest, what went toward the balance and what's still owed.`,
  },
  {
    slug: 'assets',
    title: 'Your home, car and other assets',
    section: 'Savings, debt and investing',
    summary: 'Add what you own at today\'s value, give it a yearly change, and keep loans on the Debt page.',
    keywords: 'assets home house car vehicle value appreciation equity mortgage own owe family loan cash valuables business net worth',
    body: `The [Assets](/assets) page is for things worth money that aren't a savings goal or an investment account: your home, a car, cash outside the app, valuables, a business. They count toward your net worth from the day you add them.

## Adding something
- **Name** and **Type** (home, vehicle, cash, valuables, business, loan or other).
- **This is something I own**, or **I owe (no monthly payment)**, for the odd thing like a loan from family. A loan with a monthly payment belongs on [Debt](/debt), where it pays down month by month.
- **Value**: what it would sell for today.
- **Changes by, each year**: how the projection moves it. A home starts at a cautious 3% a year (US homes have averaged about 4.5% a year since 1975), a vehicle at −10%, and everything else at 0, which keeps the value where it is. Change any of them; they're guesses, not promises.

Up to 50 items. The monthly check-in lists them so you can correct a value when it changes.

## A house and its mortgage are two things
The house goes here as something you own. The mortgage goes on the [Debt](/debt) page with its balance, rate and payment; it's marked **minimum only** so your extra money skips it. Net worth counts both from day one, so your equity (the value less what's left on the loan) is always in the picture, not only once the loan is gone. The dashboard's net worth card shows that **Home equity** line when you have a home.`,
  },
  {
    slug: 'invest',
    title: 'Investment accounts',
    section: 'Savings, debt and investing',
    summary: 'Add your 401(k), IRA or brokerage account, include your employer match, and see the growth.',
    keywords: '401k ira roth brokerage hsa expected return employer match split 100 percent growth retirement',
    body: `The [Invest](/invest) page spreads your Investments amount from Plan across your accounts and shows what it could grow into. The banner at the top shows that amount; type a new one there and it saves to your plan's Investments category.

## Adding an account
- **Name** and **Type**: 401(k), IRA, Roth IRA, brokerage, HSA or other.
- **Balance**: what it's worth today. Update it whenever you check.
- **Expected yearly return**: 7% unless you change it. It's an assumption, not a promise.

You can have up to 50 accounts.

## Employer match
If your employer adds money when you contribute, fill in the match. "50% match up to 6%" means **Match** 50 and **Up to** 6: your employer adds half of what you put in, on contributions up to 6% of your monthly income. The match is added on top of your own contributions in every projection.

## Splitting your monthly amount
With two or more accounts, press **Change split** to choose each account's share. The shares must add up to 100%, or use **Split evenly**. If they don't add up, the page warns you and scales them until you fix it.

## Growth
The **Growth** tab shows what you put in, your employer's match, and growth over 30 years, with a table at 5, 10, 20 and 30 years.`,
  },
  {
    slug: 'dashboard',
    title: 'The dashboard',
    section: 'Dashboard',
    summary: 'Your net worth today, the years slider, the projection chart and your money timeline.',
    keywords: 'net worth slider projection chart milestones timeline roadmap assets liabilities home car house mortgage equity appreciation value confetti history',
    body: `The Dashboard brings everything together: where you stand today and where your plan takes you.

## Net worth and the years slider
**Net worth = savings + investments + other assets − debts − other things you owe.** Drag the slider anywhere from today to 40 years out to see the projected value and how much it changed. If you've added a home, a **Home equity** line shows what it's worth less what's left on your mortgage.

## Projection
The chart stacks your savings, investments and other assets above the line and your debt below it, with your net worth drawn on top. A dashed line marks the year on the slider.

## Money timeline
A dated roadmap of what's coming: each debt paid off, the day you're debt-free, each goal reached, and your next net-worth milestones. When a milestone is close, the mascot celebrates. Tap the mascot any time for confetti.

## Homes, cars and other things
Your home, car and anything else you own live on the [Assets](/assets) page. Under the net worth figure, **Home** is your home's value and **Other** is everything else you own there; if you've recorded something you owe outside the Debt page, a second line splits your debts into **Debt page** and **Other**. Both "Other" words link to the Assets page.

## Warnings
If your plan is over-allocated, or your Debt amount doesn't cover your minimum payments, the dashboard tells you and links to Plan to fix it.`,
  },
  {
    slug: 'todays-dollars',
    title: "Today's dollars and assumptions",
    section: 'Dashboard',
    summary: "What the Today's dollars switch does, and how to change inflation, raises and where finished money goes.",
    keywords: 'inflation real value purchasing power raise salary assumptions settings destination remaining after debt after goals',
    body: `## Today's dollars
A dollar in 20 years won't buy what a dollar buys now. Switch on **Today's dollars** on the Dashboard to show future amounts in what they'd be worth today, after inflation. Switch it off to see the actual dollar amounts your accounts would show.

It only changes how numbers are shown, not your plan. It resets to off each time you open the Dashboard.

## Assumptions
Press **Assumptions** on the Dashboard to change what every projection assumes:
- **Inflation**: used by Today's dollars. 3% a year unless you change it.
- **Yearly raise**: how much your income grows each year. The extra goes to Remaining (it isn't projected until you give it a job), and it raises any employer-match cap.
- **Once all debt is paid**, that money goes to Investments, Savings goals, or back to Remaining.
- **Once all goals are full**, that money goes to Investments, Debt payoff, or back to Remaining.

"Back to Remaining" means the app stops projecting that money.`,
  },
  {
    slug: 'check-in',
    title: 'Monthly check-in and report card',
    section: 'Dashboard',
    summary: 'Once a month, confirm your real balances. You get a one-screen recap you can email to yourself.',
    keywords: 'check in update balances snapshot history report card recap email copy monthly',
    body: `Dollars at Work never connects to your bank, so balances only change when you update them. The **monthly check-in** is a quick way to do that.

## Doing a check-in
On the Dashboard, press **Start check-in**. You'll see every goal, debt, account and other item with its last balance. Look each one up, correct any that changed, and press **Save check-in**. It takes about a minute.

Saving records this month's net worth. If you check in again in the same month, it updates that month's record.

## Your report card
After saving you get a one-screen recap: your net worth and how it changed since last time, how your savings, investments and debt moved, and where your plan is headed. Press **Email me a copy** to send it to your own email address. Open it again any time with **See your recap**.

## Net worth history
From your second check-in, the **Net worth history** card charts how your net worth has really changed, month by month.`,
  },
  {
    slug: 'what-if',
    title: 'What-if scenarios',
    section: 'Tools and what-ifs',
    summary: 'Try up to 3 different versions of your plan and compare them with your real one.',
    keywords: 'scenario compare raise cut spending side by side alternative plan version',
    body: `On [What if](/what-if) you can ask questions like "what if I cut dining out?" or "what if I get a raise?" without touching your real plan.

## Making a what-if
Press **New what-if**, give it a name, and change anything:
- your income and any category amount (dollars or a percent),
- your yearly raise,
- how you pay off debt (Snowball, Avalanche or Custom),
- where money goes once your debt is gone or your goals are full.

A what-if only remembers what you changed. Everything else follows your real plan, so if you update your plan later, your what-ifs stay up to date.

You can keep up to 3. Delete one to make room for another.

## Comparing
The chart shows your net worth over 40 years for your current plan (solid line) and each what-if (dashed). The table puts them side by side: debt-free date, net worth in 10, 20 and 30 years, and the interest you'd pay.

Like your plan, these are estimates, not advice.`,
  },
  {
    slug: 'tools',
    title: 'Free calculators',
    section: 'Tools and what-ifs',
    summary: 'Five quick calculators anyone can use, with or without an account. Nothing is saved.',
    keywords: 'calculator compound interest early payoff loan comparison drip dividend reinvest habit',
    body: `The [Tools](/tools) page has five calculators. They're free to use without an account, results update as you type, and nothing you enter is saved or changes your plan.

- [Cost of a habit](/tools?tool=habit): what a monthly expense could grow to if you invested it instead.
- [Compound interest](/tools?tool=compound): what a starting amount plus regular monthly additions grows into.
- [Early payoff](/tools?tool=payoff): how much time and interest an extra monthly payment saves on a loan.
- [Loan comparison](/tools?tool=compare): two offers for the same amount, side by side: monthly payment, total interest and total paid.
- [DRIP](/tools?tool=drip): what reinvesting dividends adds compared with taking them as cash.

Every result is an estimate based on the numbers you enter, not financial advice.`,
  },
  {
    slug: 'glossary',
    title: 'Money words explained',
    section: 'Tools and what-ifs',
    summary: 'Plain meanings for APR, APY, net worth, snowball, avalanche, employer match and more.',
    keywords: 'definitions terms meaning what is',
    body: `- **Take-home pay**: what lands in your account after taxes and deductions. Your plan starts from this.
- **Net worth**: everything you own minus everything you owe.
- **APR** (annual percentage rate): the yearly interest rate on a debt. A card at 24% APR costs about 2% of the balance each month.
- **APY** (annual percentage yield): the yearly interest a savings account pays you, including interest on interest.
- **Minimum payment**: the least a lender accepts each month.
- **Snowball**: paying the smallest debt first for quick wins, then rolling its payment into the next.
- **Avalanche**: paying the highest-interest debt first, which costs the least in total.
- **Employer match**: money your employer adds to your retirement account when you contribute.
- **Expected return**: the yearly growth you assume for an investment. It's a guess about the future, not a promise.
- **Inflation**: prices rising over time, so a dollar buys less each year. See [Today's dollars](/help/todays-dollars).
- **DRIP**: a dividend reinvestment plan, which uses dividends to buy more shares instead of paying them out.`,
  },
  {
    slug: 'trial-and-billing',
    title: 'Free trial, subscribing and canceling',
    section: 'Account and billing',
    summary: 'Your 30-day trial needs no card. Subscribe, change plans or cancel from Profile & billing.',
    keywords: 'price cost subscription pay card cancel refund trial expired read-only past due resubscribe manage billing stripe monthly annual founding coupon promo promotion code discount',
    body: `## Your free trial
Every new account gets 30 days of full access, and no card is needed. The banner at the top of each page counts down the days.

A few emails come with the trial, each at most once: a welcome in your first hour with your own numbers (your net worth in 10 years and your debt-free date, if you have debt) or, if you haven't built a plan yet, a note that it's waiting; a suggestion around day 3 to try one what-if scenario; and a reminder a week before the trial ends and again two days before. You can reply to any of them. The getting-started emails (the welcome, or the "plan is waiting" note, and the what-if suggestion) have an **Unsubscribe** link at the bottom if you'd rather not get them; the trial reminders still come, since they're about your account.

## Subscribing
Go to [Profile & billing](/profile), choose a plan, and press **Subscribe**. You'll enter your card on Stripe's secure checkout page; Dollars at Work never sees or stores your card. Current prices are on the [Pricing](/pricing) page.

## Founding price
While spots last, the first 200 members can choose **Founding**: the annual plan at a lower launch price that stays the same each year for as long as you keep your subscription. The pricing page shows how many spots are left.

## Promotion codes
Got a code? Enter it on Stripe's checkout page after you press Subscribe. If the code covers the whole price, you won't be asked for a card.

## Managing or canceling
Press **Manage billing** on [Profile & billing](/profile) to update your card, see your invoices, or cancel. When you cancel, you keep full access until the end of the period you've paid for.

## Refunds
Not happy? Email dollarsatworkapp@gmail.com within 30 days of your first payment and we'll refund it in full.

## If a payment fails
You'll see an **Update your card** banner. Update it within 7 days and nothing changes.

## When access ends
If your trial or subscription ends without payment, nothing is deleted. Everything stays there for you to look at, but editing is turned off until you subscribe again.`,
  },
  {
    slug: 'account',
    title: 'Your account and your data',
    section: 'Account and billing',
    summary: 'Change your email or password, download your data, or delete your account.',
    keywords: 'email password change reset forgot export download csv json delete account close sign out',
    body: `Everything here is on [Profile & billing](/profile).

## Email and password
- **Change email**: enter the new address and your password. We send a link to the new address, and your email changes when you open it.
- **Confirm your email**: until you open the link we sent when you signed up, the dashboard reminds you, with a **Resend** button. Your trial reminders go to that address, so it's worth getting right.
- **Change password**: enter your current password and a new one (at least 8 characters, including a number). Other devices are signed out.
- **Forgot your password?** Use the link on the sign-in page and we'll email you a reset link.
- After five wrong passwords, sign-in locks for 15 minutes.

## Download your data
Under **Your data**, download everything you've entered (your plan, goals, debts, accounts and net-worth history) as spreadsheets (CSV) or JSON.

## Delete your account
**Delete my account** permanently removes your account and everything in it, and cancels any subscription straight away, with no refund for unused time. Download your data first if you want a copy. This can't be undone.`,
  },
  {
    slug: 'install-app',
    title: 'Put it on your home screen',
    section: 'Account and billing',
    summary: 'Install Dollars at Work to open it like any other app, on your phone or computer.',
    keywords: 'install app phone iphone android mobile desktop home screen pwa offline',
    body: `Dollars at Work works in any modern browser, and you can also install it so it opens in its own window, one tap from your home screen or desktop.

- When your browser supports it, [Profile & billing](/profile) shows an **Install the app** button.
- On an iPhone or iPad, open the site in Safari, tap the Share button, then **Add to Home Screen**.

The installed app is the same site: your plan is always loaded fresh from your account, and nothing about your money is stored on the device.`,
  },
  {
    slug: 'privacy',
    title: 'Privacy and security',
    section: 'Account and billing',
    summary: 'No bank login, ever. You type in your numbers; we keep them safe and never sell them.',
    keywords: 'security safe bank login plaid data sell privacy policy cookies',
    body: `Dollars at Work never asks for your bank login. You tell it your numbers and it shows you where they lead. That means there are no bank connections to break, and nobody else can see your transactions through us.

- Your password is stored scrambled (hashed), so nobody can read it.
- One cookie keeps you signed in. There are no advertising or tracking cookies.
- We count visits to the public pages and calculator use with an anonymous event (what happened and when, plus the referral tag if the address had one). No cookie, no IP address, no user id, no third-party scripts.
- Card payments are handled by Stripe; your card never reaches us.
- We don't sell your data or share it for advertising.
- You can download or delete everything from [Profile & billing](/profile).

The [Security](/security) page and the [Privacy Policy](/privacy) have the details.`,
  },
];

export function findArticle(slug: string | undefined): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}
