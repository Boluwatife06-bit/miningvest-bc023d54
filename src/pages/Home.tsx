import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatNaira } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { Pickaxe, TrendingUp, Users, Copy, Zap } from "lucide-react";
import heroBanner from "@/assets/hero-banner.jpg";

interface Product {
  id: string;
  name: string;
  price: number;
  roi: number;
  duration_days: number;
}

const Home = () => {
  const { profile, refreshProfile } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [investing, setInvesting] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("products").select("*").eq("is_active", true).order("sort_order").then(({ data }) => {
      if (data) setProducts(data);
    });
  }, []);

  const handleInvest = async (product: Product) => {
    if (!profile) return;
    if (profile.balance < product.price) {
      toast({ title: "Insufficient balance", description: `You need ${formatNaira(product.price)} to invest. Please deposit first.`, variant: "destructive" });
      return;
    }
    setInvesting(product.id);

    const newBalance = profile.balance - product.price;
    const { error: balanceError } = await supabase.from("profiles").update({ balance: newBalance }).eq("user_id", profile.user_id);
    if (balanceError) {
      toast({ title: "Investment failed", description: balanceError.message, variant: "destructive" });
      setInvesting(null);
      return;
    }

    const { error: investError } = await supabase.from("investments").insert({
      user_id: profile.user_id,
      product_id: product.id,
      amount: product.price,
      roi: product.roi,
      status: "active",
    });

    if (investError) {
      // Rollback
      await supabase.from("profiles").update({ balance: profile.balance }).eq("user_id", profile.user_id);
      toast({ title: "Investment failed", description: investError.message, variant: "destructive" });
    } else {
      toast({ title: "Investment successful! 🎉", description: `You invested in ${product.name}. ROI of ${formatNaira(product.roi)} pending.` });
      refreshProfile();
    }
    setInvesting(null);
  };

  const referralLink = profile ? `${window.location.origin}/register?ref=${profile.referral_code}` : "";

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Referral link copied! 📋" });
  };

  const productIcons = [Pickaxe, Zap, TrendingUp, Users];

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Top header */}
      <div className="nav-blur sticky top-0 z-40 border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg gold-gradient flex items-center justify-center">
            <Pickaxe className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold gold-text text-lg">MiningVest</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">Balance</p>
          <p className="font-bold text-primary">{formatNaira(profile?.balance ?? 0)}</p>
        </div>
      </div>

      {/* Hero */}
      <div className="relative overflow-hidden mx-4 mt-4 rounded-2xl">
        <img src={heroBanner} alt="Mining investment" className="w-full h-44 object-cover rounded-2xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent rounded-2xl" />
        <div className="absolute bottom-0 left-0 p-4">
          <h2 className="text-xl font-bold text-foreground leading-tight">Invest Smart,<br /><span className="gold-text">Earn Daily</span></h2>
          <p className="text-xs text-muted-foreground mt-1">Nigeria's #1 mining investment platform</p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="mx-4 mt-4 p-4 rounded-2xl balance-card">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">Total Balance</p>
            <p className="text-2xl font-bold text-primary mt-0.5">{formatNaira(profile?.balance ?? 0)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Referral Earnings</p>
            <p className="text-lg font-bold text-foreground mt-0.5">{formatNaira(profile?.referral_earnings ?? 0)}</p>
          </div>
        </div>
        {profile && (
          <button onClick={copyReferralLink} className="mt-3 w-full flex items-center gap-2 p-2 rounded-lg bg-background/40 border border-border hover:border-primary/40 transition-all text-left">
            <Copy className="w-4 h-4 text-primary flex-shrink-0" />
            <span className="text-xs text-muted-foreground truncate flex-1">{referralLink}</span>
            <span className="text-xs text-primary font-medium">Copy</span>
          </button>
        )}
      </div>

      {/* Products */}
      <div className="px-4 mt-6">
        <h3 className="text-lg font-bold text-foreground mb-3">Investment Plans</h3>
        <div className="grid grid-cols-1 gap-3">
          {products.map((product, idx) => {
            const Icon = productIcons[idx % productIcons.length];
            const roi_pct = Math.round(((product.roi - product.price) / product.price) * 100);
            return (
              <div key={product.id} className="product-card rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl gold-gradient flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground text-sm">{product.name}</h4>
                      <span className="text-[10px] text-green-400 font-medium bg-green-400/10 px-2 py-0.5 rounded-full">+{roi_pct}% ROI</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="font-bold text-foreground">{formatNaira(product.price)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between bg-background/30 rounded-xl p-3 mb-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Return (ROI)</p>
                    <p className="font-bold text-primary text-lg">{formatNaira(product.roi)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="font-semibold text-foreground">{product.duration_days} days</p>
                  </div>
                </div>
                <Button
                  className="w-full gold-gradient text-primary-foreground font-bold"
                  onClick={() => handleInvest(product)}
                  disabled={investing === product.id}
                >
                  {investing === product.id ? "Processing..." : "Invest Now"}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Home;
