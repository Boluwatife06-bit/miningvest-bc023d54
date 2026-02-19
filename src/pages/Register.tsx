import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { phoneToEmail, validateNigerianPhone, formatPhone } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Pickaxe } from "lucide-react";

const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || "";

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const generateReferralCode = () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      toast({ title: "Name required", description: "Please enter your full name", variant: "destructive" });
      return;
    }
    if (!validateNigerianPhone(phone)) {
      toast({ title: "Invalid phone", description: "Enter a valid Nigerian phone number (e.g. 08012345678)", variant: "destructive" });
      return;
    }
    if (password.length < 6) {
      toast({ title: "Weak password", description: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    if (password !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }

    setLoading(true);
    const normalizedPhone = formatPhone(phone);
    const email = phoneToEmail(normalizedPhone);
    const newReferralCode = generateReferralCode();

    // Check if phone already registered
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("phone", normalizedPhone)
      .maybeSingle();

    if (existingProfile) {
      toast({ title: "Phone already registered", description: "Please login instead", variant: "destructive" });
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }

    if (data.user) {
      // Find referrer
      let referrerId: string | null = null;
      if (referralCode) {
        const { data: referrer } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("referral_code", referralCode)
          .maybeSingle();
        if (referrer) referrerId = referrer.user_id;
      }

      const { error: profileError } = await supabase.from("profiles").insert({
        user_id: data.user.id,
        phone: normalizedPhone,
        full_name: fullName,
        referral_code: newReferralCode,
        referred_by: referrerId,
        balance: 0,
        referral_earnings: 0,
      });

      if (profileError) {
        toast({ title: "Profile creation failed", description: profileError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      // Credit referrer ₦1,000
      if (referrerId) {
        const { data: referrerProfile } = await supabase
          .from("profiles")
          .select("balance, referral_earnings")
          .eq("user_id", referrerId)
          .single();

        if (referrerProfile) {
          await supabase.from("profiles").update({
            balance: referrerProfile.balance + 1000,
            referral_earnings: referrerProfile.referral_earnings + 1000,
          }).eq("user_id", referrerId);
        }
      }

      toast({ title: "Registration successful! 🎉", description: "Welcome to MiningVest" });
      navigate("/home");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background py-8">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center mb-3 shadow-lg">
            <Pickaxe className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold gold-text">MiningVest</h1>
          <p className="text-muted-foreground text-sm mt-1">Start earning today</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 card-glow">
          <h2 className="text-xl font-bold text-foreground mb-6">Create Account</h2>
          {referralCode && (
            <div className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/30 text-sm text-primary">
              🎁 Referral code applied: <strong>{referralCode}</strong>
            </div>
          )}
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <Label className="text-foreground">Full Name</Label>
              <Input
                placeholder="John Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5 bg-secondary border-border text-foreground placeholder:text-muted-foreground input-gold"
                maxLength={100}
              />
            </div>
            <div>
              <Label className="text-foreground">Phone Number</Label>
              <Input
                type="tel"
                placeholder="08012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 bg-secondary border-border text-foreground placeholder:text-muted-foreground input-gold"
                maxLength={14}
              />
            </div>
            <div>
              <Label className="text-foreground">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-secondary border-border text-foreground placeholder:text-muted-foreground pr-10 input-gold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-foreground">Confirm Password</Label>
              <Input
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1.5 bg-secondary border-border text-foreground placeholder:text-muted-foreground input-gold"
              />
            </div>
            <Button type="submit" className="w-full gold-gradient text-primary-foreground font-bold py-3" disabled={loading}>
              {loading ? "Creating account..." : "Create Account"}
            </Button>
          </form>
          <p className="text-center text-muted-foreground text-sm mt-4">
            Already have an account?{" "}
            <Link to="/login" className="text-primary font-semibold hover:underline">Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;
