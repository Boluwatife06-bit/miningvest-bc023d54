import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatNaira } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { Wallet, Copy, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface Deposit {
  id: string;
  amount: number;
  transaction_id: string;
  status: string;
  created_at: string;
}

const BANK_NAME = "Opay";
const ACCOUNT_NUMBER = "8107542964";
const ACCOUNT_NAME = "Ajayi Boluwatife";

const Deposit = () => {
  const { profile, refreshProfile } = useAuth();
  const [amount, setAmount] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deposits, setDeposits] = useState<Deposit[]>([]);

  const fetchDeposits = async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("deposits")
      .select("*")
      .eq("user_id", profile.user_id)
      .order("created_at", { ascending: false });
    if (data) setDeposits(data);
  };

  useEffect(() => {
    fetchDeposits();
  }, [profile]);

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `${label} copied!` });
  };

  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(amount, 10);
    if (!amountNum || amountNum < 100) {
      toast({ title: "Invalid amount", description: "Minimum deposit is ₦100", variant: "destructive" });
      return;
    }
    if (!transactionId.trim()) {
      toast({ title: "Transaction ID required", variant: "destructive" });
      return;
    }
    if (!profile) return;
    setSubmitting(true);

    const { error } = await supabase.from("deposits").insert({
      user_id: profile.user_id,
      amount: amountNum,
      transaction_id: transactionId.trim().slice(0, 100),
      proof_note: note.trim().slice(0, 500),
      status: "pending",
    });

    if (error) {
      toast({ title: "Submission failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Deposit request submitted! ✅", description: "Admin will approve within 24 hours" });
      setAmount("");
      setTransactionId("");
      setNote("");
      fetchDeposits();
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
          <Wallet className="w-5 h-5 text-primary" /> Deposit
        </h1>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Balance */}
        <div className="balance-card rounded-2xl p-4">
          <p className="text-xs text-muted-foreground">Current Balance</p>
          <p className="text-3xl font-bold text-primary mt-1">{formatNaira(profile?.balance ?? 0)}</p>
        </div>

        {/* Bank Details */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-foreground">Bank Transfer Details</h3>
          </div>
          <div className="space-y-3">
            {[
              { label: "Bank Name", value: BANK_NAME },
              { label: "Account Number", value: ACCOUNT_NUMBER },
              { label: "Account Name", value: ACCOUNT_NAME },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between bg-secondary rounded-xl px-4 py-3">
                <div>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="font-semibold text-foreground">{value}</p>
                </div>
                <button onClick={() => copyText(value, label)} className="p-2 rounded-lg hover:bg-background/50 transition-all">
                  <Copy className="w-4 h-4 text-primary" />
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
            Send money to the account above, then fill in the form below with your transaction details for admin verification.
          </p>
        </div>

        {/* Deposit Form */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-bold text-foreground mb-4">Submit Deposit Request</h3>
          <form onSubmit={handleSubmitDeposit} className="space-y-4">
            <div>
              <Label className="text-foreground">Amount (₦)</Label>
              <Input
                type="number"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1.5 bg-secondary border-border text-foreground placeholder:text-muted-foreground input-gold"
                min="100"
              />
            </div>
            <div>
              <Label className="text-foreground">Transaction ID / Reference</Label>
              <Input
                placeholder="e.g. TRF1234567890"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                className="mt-1.5 bg-secondary border-border text-foreground placeholder:text-muted-foreground input-gold"
                maxLength={100}
              />
            </div>
            <div>
              <Label className="text-foreground">Additional Note (optional)</Label>
              <Input
                placeholder="Any extra info for admin"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1.5 bg-secondary border-border text-foreground placeholder:text-muted-foreground input-gold"
                maxLength={500}
              />
            </div>
            <Button type="submit" className="w-full gold-gradient text-primary-foreground font-bold" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Deposit Request"}
            </Button>
          </form>
        </div>

        {/* Deposit History */}
        {deposits.length > 0 && (
          <div className="bg-card border border-border rounded-2xl p-4">
            <h3 className="font-bold text-foreground mb-3">Deposit History</h3>
            <div className="space-y-2">
              {deposits.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-3 bg-secondary rounded-xl">
                  <div className="flex items-center gap-2">
                    <StatusIcon status={d.status} />
                    <div>
                      <p className="font-semibold text-foreground text-sm">{formatNaira(d.amount)}</p>
                      <p className="text-xs text-muted-foreground">Ref: {d.transaction_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] font-medium px-2 py-1 rounded-full capitalize ${statusClass(d.status)}`}>
                      {d.status}
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(d.created_at).toLocaleDateString("en-NG", { day: "2-digit", month: "short" })}
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

export default Deposit;
