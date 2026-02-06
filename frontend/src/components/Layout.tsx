import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  Radar,
  LayoutDashboard,
  Rss,
  Search,
  Mail,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../auth";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/feed", label: "Feed", icon: Rss, end: false },
  { to: "/search", label: "Search", icon: Search, end: false },
  { to: "/digests", label: "Digests", icon: Mail, end: false },
  { to: "/settings", label: "Settings", icon: Settings, end: false },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar */}
      <header className="bg-primary-900 text-white shadow-lg sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <NavLink to="/" className="flex items-center gap-2.5 shrink-0">
              <Radar className="w-7 h-7 text-primary-200" />
              <span className="text-lg font-bold tracking-tight">
                Regulatory<span className="text-primary-300">Radar</span>
              </span>
            </NavLink>

            {/* Desktop Nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "text-primary-200 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>

            {/* User Menu (Desktop) */}
            <div className="hidden md:flex items-center gap-3">
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium text-primary-200 hover:bg-white/10 hover:text-white transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-primary-700 flex items-center justify-center">
                    <User className="w-4 h-4" />
                  </div>
                  <span className="max-w-[160px] truncate">
                    {user?.email}
                  </span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>

                {userMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setUserMenuOpen(false)}
                    />
                    <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user?.email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {user?.is_admin ? "Administrator" : "User"}
                        </p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="w-4 h-4" />
                        Sign out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-primary-200 hover:bg-white/10 hover:text-white transition-colors"
            >
              {mobileMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-primary-800">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "text-primary-200 hover:bg-white/10 hover:text-white"
                    }`
                  }
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                </NavLink>
              ))}
              <div className="pt-2 border-t border-primary-800">
                <div className="px-3 py-2 text-sm text-primary-300">
                  {user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-300 hover:bg-white/10 transition-colors w-full"
                >
                  <LogOut className="w-5 h-5" />
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Outlet />
      </main>
    </div>
  );
}
