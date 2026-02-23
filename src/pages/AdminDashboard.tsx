import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatNaira } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { ShieldCheck, Users, Wallet, BarChart3, CheckCircle, XCircle, ArrowUpFromLine } from "lucide-react";
import { Navigate } from "react-router-dom";

type Tab = "deposits" | "withdrawals" | "investments" | "users";

interface AdminDeposit {
  id: string;
  amount: number;
  transaction_id: string;
  status: string;
  proof_note: string | null;
  created_at: string;
  user_id: string;
  profiles: { phone: string; full_name: string | null } | null;
}

interface AdminInvestment {
  id: string;
  amount: number;
  roi: number;
  status: string;
  invested_at: string;
  user_id: string;
  profiles: { phone: string; full_name: string | null } | null;
  products: { name: string } | null;
}

interface AdminUser {
  id: string;
  phone: string;
  full_name: string | null;
  balance: number;
  
  created_at: string;
}

interface AdminWithdrawal {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  created_at: string;
  user_id: string;
  profiles: { phone: string; full_name: string | null } | null;
}

const AdminDashboard = () => {
  const { isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("deposits");
  const [deposits, setDeposits] = useState<AdminDeposit[]>([]);
  const [investments, setInvestments] = useState<AdminInvestment[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([]);
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchDeposits = async () => {
    const { data: deps } = await supabase
      .from("deposits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!deps) return;

    // Enrich with profiles
    const userIds = [...new Set(deps.map((d) => d.user_id))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, phone, full_name")
      .in("user_id", userIds);

    const profMap = Object.fromEntries((profs ?? []).map((p) => [p.user_id, p]));
    setDeposits(deps.map((d) => ({ ...d, profiles: profMap[d.user_id] ?? null })) as AdminDeposit[]);
  };

  const fetchInvestments = async () => {
    const { data: invs } = await supabase
      .from("investments")
      .select("*, products(name)")
      .order("invested_at", { ascending: false })
      .limit(100);
    if (!invs) return;

    const userIds = [...new Set(invs.map((i) => i.user_id))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, phone, full_name")
      .in("user_id", userIds);

    const profMap = Object.fromEntries((profs ?? []).map((p) => [p.user_id, p]));
    setInvestments(invs.map((i) => ({ ...i, profiles: profMap[i.user_id] ?? null })) as AdminInvestment[]);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data) setUsers(data);
  };

  const fetchWithdrawals = async () => {
    const { data: wds } = await supabase
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!wds) return;

    const userIds = [...new Set(wds.map((w) => w.user_id))];
    const { data: profs } = await supabase
      .from("profiles")
      .select("user_id, phone, full_name")
      .in("user_id", userIds);

    const profMap = Object.fromEntries((profs ?? []).map((p) => [p.user_id, p]));
    setWithdrawals(wds.map((w) => ({ ...w, profiles: profMap[w.user_id] ?? null })) as AdminWithdrawal[]);
  };

  useEffect(() => {
    if (!isAdmin) return;
    fetchDeposits();
    fetchWithdrawals();
    fetchInvestments();
    fetchUsers();
  }, [isAdmin]);

  if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">Loading...</div>;
  if (!isAdmin) return <Navigate to="/home" replace />;

  const approveDeposit = async (deposit: AdminDeposit) => {
    if (processing) return;
    setProcessing(deposit.id);

    // Get user's current balance
    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("user_id", deposit.user_id)
      .single();

    if (!profile) {
      toast({ title: "User profile not found", variant: "destructive" });
      setProcessing(null);
      return;
    }

    const { error: depositError } = await supabase
      .from("deposits")
      .update({ status: "approved" })
      .eq("id", deposit.id);

    if (depositError) {
      toast({ title: "Error", description: depositError.message, variant: "destructive" });
      setProcessing(null);
      return;
    }

    await supabase.from("profiles").update({ balance: profile.balance + deposit.amount }).eq("user_id", deposit.user_id);
    toast({ title: `Deposit approved — ${formatNaira(deposit.amount)} credited ✅` });
    fetchDeposits();
    setProcessing(null);
  };

  const rejectDeposit = async (id: string) => {
    if (processing) return;
    setProcessing(id);
    await supabase.from("deposits").update({ status: "rejected" }).eq("id", id);
    toast({ title: "Deposit rejected" });
    fetchDeposits();
    setProcessing(null);
  };

  const completeInvestment = async (inv: AdminInvestment) => {
    if (processing) return;
    setProcessing(inv.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("user_id", inv.user_id)
      .single();

    if (!profile) {
      toast({ title: "User not found", variant: "destructive" });
      setProcessing(null);
      return;
    }

    await supabase.from("investments").update({ status: "completed", completed_at: new Date().toISOString() }).eq("id", inv.id);
    await supabase.from("profiles").update({ balance: profile.balance + inv.roi }).eq("user_id", inv.user_id);
    toast({ title: `Investment completed — ROI of ${formatNaira(inv.roi)} credited ✅` });
    fetchInvestments();
    setProcessing(null);
  };

  const approveWithdrawal = async (w: AdminWithdrawal) => {
    if (processing) return;
    setProcessing(w.id);

    const { data: profile } = await supabase
      .from("profiles")
      .select("balance")
      .eq("user_id", w.user_id)
      .single();

    if (!profile) {
      toast({ title: "User not found", variant: "destructive" });
      setProcessing(null);
      return;
    }

    if (profile.balance < w.amount) {
      toast({ title: "User has insufficient balance", variant: "destructive" });
      setProcessing(null);
      return;
    }

    const { error } = await supabase
      .from("withdrawals")
      .update({ status: "approved" })
      .eq("id", w.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setProcessing(null);
      return;
    }

    await supabase.from("profiles").update({ balance: profile.balance - w.amount }).eq("user_id", w.user_id);
    toast({ title: `Withdrawal approved — ${formatNaira(w.amount)} deducted ✅` });
    fetchWithdrawals();
    setProcessing(null);
  };

  const rejectWithdrawal = async (id: string) => {
    if (processing) return;
    setProcessing(id);
    await supabase.from("withdrawals").update({ status: "rejected" }).eq("id", id);
    toast({ title: "Withdrawal rejected" });
    fetchWithdrawals();
    setProcessing(null);
  };

  const stats = {
    totalUsers: users.length,
    pendingDeposits: deposits.filter((d) => d.status === "pending").length,
    pendingWithdrawals: withdrawals.filter((w) => w.status === "pending").length,
    activeInvestments: investments.filter((i) => i.status === "active").length,
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="nav-blur sticky top-0 z-40 border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Admin Dashboard
        </h1>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <Users className="w-5 h-5 text-primary mx-auto" />
            <p className="text-lg font-bold text-foreground mt-1">{stats.totalUsers}</p>
            <p className="text-[10px] text-muted-foreground">Users</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <Wallet className="w-5 h-5 text-primary mx-auto" />
            <p className="text-lg font-bold text-foreground mt-1">{stats.pendingDeposits}</p>
            <p className="text-[10px] text-muted-foreground">Pend. Dep.</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <ArrowUpFromLine className="w-5 h-5 text-primary mx-auto" />
            <p className="text-lg font-bold text-foreground mt-1">{stats.pendingWithdrawals}</p>
            <p className="text-[10px] text-muted-foreground">Pend. Wdr.</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <BarChart3 className="w-5 h-5 text-primary mx-auto" />
            <p className="text-lg font-bold text-foreground mt-1">{stats.activeInvestments}</p>
            <p className="text-[10px] text-muted-foreground">Active Inv.</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-secondary rounded-xl p-1">
          {([["deposits", "Deposits"], ["withdrawals", "Withdrawals"], ["investments", "Investments"], ["users", "Users"]] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${tab === t ? "gold-gradient text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Deposits Tab */}
        {tab === "deposits" && (
          <div className="space-y-3">
            {deposits.length === 0 && <p className="text-center text-muted-foreground py-8">No deposits yet</p>}
            {deposits.map((d) => (
              <div key={d.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-foreground">{formatNaira(d.amount)}</p>
                    <p className="text-xs text-muted-foreground">{d.profiles?.full_name || "Unknown"} • {d.profiles?.phone}</p>
                    <p className="text-xs text-muted-foreground">Ref: {d.transaction_id}</p>
                    {d.proof_note && <p className="text-xs text-muted-foreground mt-1">Note: {d.proof_note}</p>}
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-1 rounded-full capitalize ${d.status === "approved" ? "status-badge-completed" : d.status === "rejected" ? "status-badge-rejected" : "status-badge-pending"}`}>
                    {d.status}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">
                  {new Date(d.created_at).toLocaleString("en-NG")}
                </p>
                {d.status === "pending" && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 gold-gradient text-primary-foreground font-bold text-xs h-8"
                      onClick={() => approveDeposit(d)}
                      disabled={!!processing}
                    >
                      <CheckCircle className="w-3 h-3 mr-1" /> Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 font-bold text-xs h-8"
                      onClick={() => rejectDeposit(d.id)}
                      disabled={!!processing}
                    >
                      <XCircle className="w-3 h-3 mr-1" /> Reject
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Withdrawals Tab */}
        {tab === "withdrawals" && (
          <div className="space-y-3">
            {withdrawals.filter((w) => w.status === "pending").length === 0 && (
              <p className="text-center text-muted-foreground py-8">No pending withdrawals</p>
            )}
            {withdrawals.filter((w) => w.status === "pending").map((w) => (
              <div key={w.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-foreground">{formatNaira(w.amount)}</p>
                    <p className="text-xs text-muted-foreground">{w.profiles?.full_name || "Unknown"} • {w.profiles?.phone}</p>
                    <p className="text-xs text-muted-foreground">{w.bank_name} • {w.account_number}</p>
                    <p className="text-xs text-muted-foreground">Acct: {w.account_name}</p>
                  </div>
                  <span className="status-badge-pending text-[10px] font-medium px-2 py-1 rounded-full">Pending</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">
                  {new Date(w.created_at).toLocaleString("en-NG")}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 gold-gradient text-primary-foreground font-bold text-xs h-8"
                    onClick={() => approveWithdrawal(w)}
                    disabled={!!processing}
                  >
                    <CheckCircle className="w-3 h-3 mr-1" /> Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="flex-1 font-bold text-xs h-8"
                    onClick={() => rejectWithdrawal(w.id)}
                    disabled={!!processing}
                  >
                    <XCircle className="w-3 h-3 mr-1" /> Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Investments Tab */}
        {tab === "investments" && (
          <div className="space-y-3">
            {investments.filter((i) => i.status === "active").length === 0 && (
              <p className="text-center text-muted-foreground py-8">No active investments</p>
            )}
            {investments.filter((i) => i.status === "active").map((inv) => (
              <div key={inv.id} className="bg-card border border-border rounded-2xl p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-foreground">{inv.products?.name}</p>
                    <p className="text-xs text-muted-foreground">{inv.profiles?.full_name || "Unknown"} • {inv.profiles?.phone}</p>
                    <p className="text-xs text-muted-foreground">Invested: {formatNaira(inv.amount)} | ROI: {formatNaira(inv.roi)}</p>
                  </div>
                  <span className="status-badge-pending text-[10px] font-medium px-2 py-1 rounded-full">Active</span>
                </div>
                <p className="text-[10px] text-muted-foreground mb-3">
                  {new Date(inv.invested_at).toLocaleString("en-NG")}
                </p>
                <Button
                  size="sm"
                  className="w-full gold-gradient text-primary-foreground font-bold text-xs h-8"
                  onClick={() => completeInvestment(inv)}
                  disabled={!!processing}
                >
                  <CheckCircle className="w-3 h-3 mr-1" /> Mark Complete & Credit ROI
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Users Tab */}
        {tab === "users" && (
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="bg-card border border-border rounded-xl p-3 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground text-sm">{u.full_name || "No name"}</p>
                  <p className="text-xs text-muted-foreground">{u.phone}</p>
                  <p className="text-[10px] text-muted-foreground">{new Date(u.created_at).toLocaleDateString("en-NG")}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary text-sm">{formatNaira(u.balance)}</p>
                  
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default AdminDashboard;
