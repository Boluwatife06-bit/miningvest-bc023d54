import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatNaira } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import BottomNav from "@/components/BottomNav";
import { User, Copy, Lock, Save, ChevronDown, ChevronUp } from "lucide-react";

const Profile = () => {
  const { profile, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [bankName, setBankName] = useState(profile?.bank_name ?? "");
  const [accountNumber, setAccountNumber] = useState(profile?.account_number ?? "");
  const [accountName, setAccountName] = useState(profile?.account_name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const referralLink = profile ? `${window.location.origin}/register?ref=${profile.referral_code}` : "";

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast({ title: "Referral link copied! 📋" });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({
      full_name: fullName.trim().slice(0, 100),
      bank_name: bankName.trim().slice(0, 100),
      account_number: accountNumber.trim().slice(0, 20),
      account_name: accountName.trim().slice(0, 100),
    }).eq("user_id", profile.user_id);

    if (error) {
      toast({ title: "Failed to save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile updated ✅" });
      refreshProfile();
    }
    setSavingProfile(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmNewPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast({ title: "Failed to update password", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Password updated ✅" });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowPasswordForm(false);
    }
    setSavingPassword(false);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="nav-blur sticky top-0 z-40 border-b border-border px-4 py-3">
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <User className="w-5 h-5 text-primary" /> Profile
        </h1>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {/* Avatar & Summary */}
        <div className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl gold-gradient flex items-center justify-center flex-shrink-0">
            <User className="w-7 h-7 text-primary-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-foreground truncate">{profile?.full_name || "User"}</p>
            <p className="text-sm text-muted-foreground">{profile?.phone}</p>
            <div className="flex gap-4 mt-1">
              <div>
                <span className="text-xs text-muted-foreground">Balance: </span>
                <span className="text-xs font-semibold text-primary">{formatNaira(profile?.balance ?? 0)}</span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Referrals: </span>
                <span className="text-xs font-semibold text-primary">{formatNaira(profile?.referral_earnings ?? 0)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Referral */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-bold text-foreground mb-3 flex items-center gap-2">
            <Copy className="w-4 h-4 text-primary" /> Referral Program
          </h3>
          <p className="text-xs text-muted-foreground mb-3">
            Share your link — earn <span className="text-primary font-semibold">₦1,000</span> for every friend who joins
          </p>
          <div className="flex items-center gap-2 p-3 rounded-xl bg-secondary border border-border">
            <span className="text-xs text-muted-foreground flex-1 truncate">{referralLink}</span>
            <button onClick={copyReferralLink} className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-all">
              <Copy className="w-4 h-4 text-primary" />
            </button>
          </div>
          <div className="mt-3 flex items-center justify-between px-3 py-2 rounded-xl bg-primary/10 border border-primary/20">
            <span className="text-xs text-muted-foreground">Total referral earnings</span>
            <span className="font-bold text-primary">{formatNaira(profile?.referral_earnings ?? 0)}</span>
          </div>
        </div>

        {/* Edit Profile */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <h3 className="font-bold text-foreground mb-4">Edit Profile</h3>
          <form onSubmit={handleSaveProfile} className="space-y-3">
            <div>
              <Label className="text-foreground text-sm">Phone Number (read-only)</Label>
              <Input
                value={profile?.phone ?? ""}
                disabled
                className="mt-1.5 bg-secondary border-border text-muted-foreground opacity-60"
              />
            </div>
            <div>
              <Label className="text-foreground text-sm">Full Name</Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                className="mt-1.5 bg-secondary border-border text-foreground placeholder:text-muted-foreground input-gold"
                maxLength={100}
              />
            </div>
            <div>
              <Label className="text-foreground text-sm">Bank Name</Label>
              <Input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. GTBank"
                className="mt-1.5 bg-secondary border-border text-foreground placeholder:text-muted-foreground input-gold"
                maxLength={100}
              />
            </div>
            <div>
              <Label className="text-foreground text-sm">Account Number</Label>
              <Input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="10-digit account number"
                className="mt-1.5 bg-secondary border-border text-foreground placeholder:text-muted-foreground input-gold"
                maxLength={20}
              />
            </div>
            <div>
              <Label className="text-foreground text-sm">Account Name</Label>
              <Input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="Name on account"
                className="mt-1.5 bg-secondary border-border text-foreground placeholder:text-muted-foreground input-gold"
                maxLength={100}
              />
            </div>
            <Button type="submit" className="w-full gold-gradient text-primary-foreground font-bold" disabled={savingProfile}>
              <Save className="w-4 h-4 mr-2" />
              {savingProfile ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </div>

        {/* Change Password */}
        <div className="bg-card border border-border rounded-2xl p-4">
          <button
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            className="w-full flex items-center justify-between"
          >
            <h3 className="font-bold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" /> Change Password
            </h3>
            {showPasswordForm ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showPasswordForm && (
            <form onSubmit={handleChangePassword} className="mt-4 space-y-3">
              <div>
                <Label className="text-foreground text-sm">New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="mt-1.5 bg-secondary border-border text-foreground placeholder:text-muted-foreground input-gold"
                />
              </div>
              <div>
                <Label className="text-foreground text-sm">Confirm New Password</Label>
                <Input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  placeholder="Repeat new password"
                  className="mt-1.5 bg-secondary border-border text-foreground placeholder:text-muted-foreground input-gold"
                />
              </div>
              <Button type="submit" variant="secondary" className="w-full font-bold" disabled={savingPassword}>
                {savingPassword ? "Updating..." : "Update Password"}
              </Button>
            </form>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
