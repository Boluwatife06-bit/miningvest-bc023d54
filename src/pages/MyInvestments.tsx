import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatNaira } from "@/lib/supabase-helpers";
import BottomNav from "@/components/BottomNav";
import { BarChart3, CheckCircle, Clock, Pickaxe } from "lucide-react";

interface Investment {
  id: string;
  amount: number;
  roi: number;
  status: string;
  invested_at: string;
  completed_at: string | null;
  products: { name: string } | null;
}

const MyInvestments = () => {
  const { profile } = useAuth();
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from("investments")
      .select("*, products(name)")
      .eq("user_id", profile.user_id)
      .order("invested_at", { ascending: false })
      .then(({ data }) => {
        if (data) setInvestments(data as Investment[]);
        setLoading(false);
      });
  }, [profile]);

  const active = investments.filter((i) => i.status === "active");
  const completed = investments.filter((i) => i.status === "completed");

  const totalInvested = investments.reduce((sum, i) => sum + i.amount, 0);
  const totalROI = completed.reduce((sum, i) => sum + i.roi, 0);

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="nav-blur sticky top-0 z-40 border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> My Investments
        </h1>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">Total Invested</p>
            <p className="text-xl font-bold text-foreground mt-1">{formatNaira(totalInvested)}</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4">
            <p className="text-xs text-muted-foreground">Total ROI Earned</p>
            <p className="text-xl font-bold text-primary mt-1">{formatNaira(totalROI)}</p>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12 text-muted-foreground">Loading...</div>
        )}

        {/* Active */}
        {active.length > 0 && (
          <div>
            <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
              <Clock className="w-4 h-4 text-yellow-400" /> Active ({active.length})
            </h3>
            <div className="space-y-3">
              {active.map((inv) => (
                <div key={inv.id} className="bg-card border border-border rounded-2xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl gold-gradient flex items-center justify-center flex-shrink-0">
                      <Pickaxe className="w-4 h-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{inv.products?.name ?? "Investment"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Invested: {new Date(inv.invested_at).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </div>
                    <span className="status-badge-pending text-[10px] font-medium px-2 py-1 rounded-full">Pending</span>
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Invested</p>
                      <p className="font-bold text-foreground">{formatNaira(inv.amount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Expected ROI</p>
                      <p className="font-bold text-primary">{formatNaira(inv.roi)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <div>
            <h3 className="font-bold text-foreground mb-2 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" /> Completed ({completed.length})
            </h3>
            <div className="space-y-3">
              {completed.map((inv) => (
                <div key={inv.id} className="bg-card border border-border rounded-2xl p-4 opacity-80">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-green-400/10 border border-green-400/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{inv.products?.name ?? "Investment"}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Completed: {inv.completed_at ? new Date(inv.completed_at).toLocaleDateString("en-NG", { day: "2-digit", month: "short", year: "numeric" }) : "—"}
                      </p>
                    </div>
                    <span className="status-badge-active text-[10px] font-medium px-2 py-1 rounded-full">Done</span>
                  </div>
                  <div className="flex justify-between mt-3 pt-3 border-t border-border">
                    <div>
                      <p className="text-xs text-muted-foreground">Invested</p>
                      <p className="font-bold text-foreground">{formatNaira(inv.amount)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">ROI Earned</p>
                      <p className="font-bold text-primary">{formatNaira(inv.roi)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && investments.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center mx-auto mb-4">
              <Pickaxe className="w-8 h-8 text-primary-foreground" />
            </div>
            <p className="text-foreground font-semibold">No investments yet</p>
            <p className="text-muted-foreground text-sm mt-1">Go to Home to start investing</p>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default MyInvestments;
