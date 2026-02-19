import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { phoneToEmail, validateNigerianPhone, formatPhone } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Eye, EyeOff, Pickaxe } from "lucide-react";

const Login = () => {
  const navigate = useNavigate();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateNigerianPhone(phone)) {
      toast({ title: "Invalid phone number", description: "Enter a valid Nigerian phone number", variant: "destructive" });
      return;
    }
    setLoading(true);
    const email = phoneToEmail(formatPhone(phone));
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Login failed", description: "Invalid phone or password", variant: "destructive" });
    } else {
      navigate("/home");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl gold-gradient flex items-center justify-center mb-3 shadow-lg">
            <Pickaxe className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold gold-text">MiningVest</h1>
          <p className="text-muted-foreground text-sm mt-1">Your trusted mining investment platform</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 card-glow">
          <h2 className="text-xl font-bold text-foreground mb-6">Welcome Back</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <Label htmlFor="phone" className="text-foreground">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="08012345678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1.5 bg-secondary border-border text-foreground placeholder:text-muted-foreground input-gold"
                maxLength={14}
              />
            </div>
            <div>
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
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
            <Button type="submit" className="w-full gold-gradient text-primary-foreground font-bold py-3" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </Button>
          </form>
          <p className="text-center text-muted-foreground text-sm mt-4">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary font-semibold hover:underline">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
