

## Plan: Update Withdrawal Minimum & Remove Auto-Rollover

### Changes

**1. Update minimum withdrawal to ₦15,000**
- **`src/pages/Withdrawal.tsx`**: Change the validation check from `10000` to `15000` and update the toast message to say "Minimum withdrawal is ₦15,000". Also update the `min` attribute on the input.

**2. Remove auto-rollover on investment completion**
The current `process-daily-roi` edge function already does NOT auto-rollover — it simply marks investments as "completed" when ROI is fully paid. No changes needed there.

However, the `place_investment` RPC currently allows investing as long as user has sufficient balance (including from ROI credits). To enforce "must deposit to invest again after completion," we need a different approach:

- **Option A (Simple UI guard)**: On the Home page, check if the user has any completed investments AND no deposits made after the last completed investment. If so, show a message prompting them to deposit first.
- **Option B (Database enforcement)**: Add a check in the `place_investment` RPC to verify the user has made a deposit since their last completed investment.

**Recommended: Option A** — simpler, less migration risk. The Home page will query whether the user has completed investments and compare against their latest deposit timestamp. If they need to deposit first, the "Invest Now" button will be disabled with a message.

### Files to modify
1. **`src/pages/Withdrawal.tsx`** — Change min amount from 10,000 to 15,000
2. **`src/pages/Home.tsx`** — Add logic to check if user has completed investments and needs to deposit before re-investing; disable invest buttons with a prompt if so

### Technical details
- Query `investments` table for any `status = 'completed'` records for the user
- Query `deposits` table for the latest `status = 'approved'` deposit timestamp
- If latest completed investment is more recent than latest approved deposit, block investing with a message like "Please make a deposit before investing again"
- First-time users (no completed investments) can invest normally

