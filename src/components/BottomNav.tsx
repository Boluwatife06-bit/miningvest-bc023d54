import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Wallet, User, LogOut, ArrowUpFromLine, BarChart3, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

const BottomNav = () => {
  const location = useLocation();
  const { signOut, isAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    toast({ title: "Logged out successfully" });
    navigate("/login");
  };

  const navItems = [
    { path: "/home", icon: Home, label: "Home" },
    { path: "/deposit", icon: Wallet, label: "Deposit" },
    { path: "/withdraw", icon: ArrowUpFromLine, label: "Withdraw" },
    { path: "/investments", icon: BarChart3, label: "Invest" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 nav-blur border-t border-border">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {navItems.map(({ path, icon: Icon, label }) => {
          const active = location.pathname === path;
          return (
            <Link key={path} to={path} className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${active ? "text-primary" : "text-muted-foreground"}`}>
              <Icon className={`w-5 h-5 ${active ? "text-primary" : ""}`} strokeWidth={active ? 2.5 : 1.5} />
              <span className={`text-[10px] font-medium ${active ? "text-primary" : ""}`}>{label}</span>
            </Link>
          );
        })}
        {isAdmin && (
          <Link to="/admin" className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-all ${location.pathname === "/admin" ? "text-primary" : "text-muted-foreground"}`}>
            <ShieldCheck className="w-5 h-5" strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Admin</span>
          </Link>
        )}
        <button onClick={handleLogout} className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl text-muted-foreground hover:text-destructive transition-all">
          <LogOut className="w-5 h-5" strokeWidth={1.5} />
          <span className="text-[10px] font-medium">Logout</span>
        </button>
      </div>
    </nav>
  );
};

export default BottomNav;
