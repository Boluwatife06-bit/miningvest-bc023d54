
# Withdrawal System

## Overview
Add a withdrawal feature where users can request to withdraw their balance to their saved bank account. Admins will review and approve/reject withdrawal requests, similar to the existing deposit flow.

## What Will Change

### 1. New Database Table: `withdrawals`
A new table to track withdrawal requests with columns:
- `id` (UUID, primary key)
- `user_id` (UUID, references auth.users)
- `amount` (bigint)
- `bank_name` (text) -- snapshot at time of request
- `account_number` (text)
- `account_name` (text)
- `status` (text: pending/approved/rejected)
- `admin_note` (text, optional)
- `created_at`, `updated_at` (timestamps)

RLS policies:
- Users can create their own withdrawals
- Users can view their own withdrawals
- Admins can view and update all withdrawals

### 2. New Page: Withdrawal (`src/pages/Withdrawal.tsx`)
- Shows current balance at top
- Withdrawal form: amount input (validated against balance, minimum amount)
- Displays user's saved bank details (from profile) -- prompts to update profile if missing
- Withdrawal history list with status badges (pending/approved/rejected)
- Same styling patterns as the Deposit page

### 3. Updated Bottom Navigation
- Add a "Withdraw" nav item (using `ArrowUpFromLine` or `BanknoteIcon` icon) between Deposit and Investments

### 4. Updated Admin Dashboard
- Add a "Withdrawals" tab alongside Deposits, Investments, Users
- Shows pending withdrawal requests with user info and bank details
- Approve button: deducts amount from user balance, marks as approved
- Reject button: marks as rejected (no balance change)
- Stats card updated to show pending withdrawals count

### 5. Route Registration
- Add `/withdraw` route in `App.tsx` as a protected route

## Withdrawal Logic
- User enters amount to withdraw
- Client-side validation: amount > 0, amount <= balance, bank details must be saved in profile
- On submit: creates a `withdrawals` row with status "pending" and snapshots bank details
- Admin approves: deducts the amount from user's balance and marks status "approved"
- Admin rejects: marks status "rejected", balance unchanged

## Technical Details

### Database Migration SQL
```sql
CREATE TABLE public.withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  amount BIGINT NOT NULL,
  bank_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can create own withdrawals" ON public.withdrawals
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own withdrawals" ON public.withdrawals
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all withdrawals" ON public.withdrawals
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update withdrawals" ON public.withdrawals
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE TRIGGER update_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
```

### Files to Create
- `src/pages/Withdrawal.tsx` -- withdrawal form + history (mirrors Deposit page pattern)

### Files to Modify
- `src/App.tsx` -- add `/withdraw` route
- `src/components/BottomNav.tsx` -- add Withdraw nav item
- `src/pages/AdminDashboard.tsx` -- add Withdrawals tab with approve/reject logic
