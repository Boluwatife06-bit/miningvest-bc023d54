import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatNaira } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { ArrowUpFromLine, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";

interface Withdrawal {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  created_at: string;
}

const Withdrawal = () => {
  const { profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);

  const fetchWithdrawals = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("user_id", profile.user_id)
      .order("created_at", { ascending: false });
    if (data) setWithdrawals(data);
  };

  useEffect(() => {
    fetchWithdrawals();
  }, [profile]);

  const hasBankDetails = profile?.bank_name && profile?.account_number && profile?.account_name;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(amount, 10);
    if (!amountNum || amountNum < 100) {
      toast({ title: "Invalid amount", description: "Minimum withdrawal is ₦100", variant: "destructive" });
      return;
    }
    if (amountNum > (profile?.balance ?? 0)) {
      toast({ title: "Insufficient balance", variant: "destructive" });
      return;
    }
    if (!hasBankDetails || !profile) return;

    setSubmitting(true);
    const { error } = await supabase.from("withdrawals").insert({
      user_id: profile.user_id,
      amount: amountNum,
      bank_name: profile.bank_name!,
      account_number: profile.account_number!,
      account_name: profile.account_name!,
      status: "pending",
    });

    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Withdrawal request submitted! ✅", description: "Admin will process within 24 hours" });
      setAmount("");
      fetchWithdrawals();
      refreshProfile();
    }
    setSubmitting(false);
  };

  const StatusIcon = ({ status }: { status: string }) => {
    if (status === "approved") return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === "rejected") return <XCircle className="w-4 h-4 text-destructive" />;
    return <Clock className="w-4 h-4 text-yellow-400" />;
  };

  const statusClass = (status: string) => {
    if (status === "approved") return "status-badge-completed";
    if (status === "rejected") return "status-badge-rejected";
    return "status-badge-pending";
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="nav-blur sticky top-0 z-40 border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ArrowUpFromLine className="w-5 h-5 text-primary" /> Withdraw
        </h1>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Balance */}
        <div className="balance-card rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Available Balance</p>
          <p className="text-3xl font-bold text-primary mt-1">{formatNaira(profile?.balance ?? 0)}</p>
        </div>

        {/* Bank Details or Prompt */}
        {!hasBankDetails ? (
          <div className="bg-card border border-border rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-destructive" />
              <h3 className="font-bold text-foreground">Bank Details Required</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-3">
              You need to save your bank details in your profile before you can withdraw.
            </p>
            <Link to="/profile">
              <Button className="w-full gold-gradient text-primary-foreground font-bold">
                Go to Profile
              </Button>
            </Link>
          </div>
        ) : (
          <>
            {/* Bank Info Display */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="font-bold text-foreground mb-3">Withdrawal Account</h3>
              <div className="space-y-2">
                {[
                  { label: "Bank", value: profile.bank_name },
                  { label: "Account No.", value: profile.account_number },
                  { label: "Account Name", value: profile.account_name },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between bg-secondary rounded-xl px-4 py-2.5">
                    <span className="text-xs text-muted-foreground">{label}</span>
                    <span className="font-semibold text-foreground text-sm">{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Wrong details? <Link to="/profile" className="text-primary underline">Update in Profile</Link>
              </p>
            </div>

            {/* Withdrawal Form */}
            <div className="bg-card border border-border rounded-2xl p-4">
              <h3 className="font-bold text-foreground mb-4">Request Withdrawal</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label className="text-foreground">Amount (₦)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 5000"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="mt-1.5 bg-secondary border-border text-foreground placeholder:text-muted-foreground input-gold"
                    min="100"
                    max={profile?.balance ?? 0}
                  />
                </div>
                <Button type="submit" className="w-full gold-gradient text-primary-foreground font-bold" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit Withdrawal Request"}
                </Button>
              </form>
            </div>
          </>
        )}

        {/* Withdrawal History */}
        {withdrawals.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="font-bold text-foreground mb-3">Withdrawal History</h3>
            <div className="space-y-2">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={w.status} />
                    <div>
                      <p className="font-semibold text-foreground text-sm">{formatNaira(w.amount)}</p>
                      <p className="text-xs text-muted-foreground">{w.bank_name} • {w.account_number}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full capitalize ${statusClass(w.status)}`}>
                      {w.status}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(w.created_at).toLocaleDateString("en-NG", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Withdrawal;
