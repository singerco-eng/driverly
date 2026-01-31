import { Link, Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Menu, X } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { path: '/website', label: 'Home', exact: true },
  { path: '/website/credentialing', label: 'Credentialing' },
  { path: '/website/pricing', label: 'Pricing' },
];

export function WebsiteLayout() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string, exact?: boolean) => {
    if (exact) return location.pathname === path;
    return location.pathname.startsWith(path);
  };

  return (
    <div className="website-theme min-h-screen">
      {/* Hero gradient background */}
      <div 
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, hsl(43 74% 49% / 0.12), transparent)',
        }}
      />
      
      {/* Navigation */}
      <nav className="ws-nav fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/website" className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                <span className="text-black font-bold text-lg">A</span>
              </div>
              <span className="font-semibold text-lg text-white">Acme</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.comingSoon ? '#' : item.path}
                  onClick={(e) => item.comingSoon && e.preventDefault()}
                  className={cn(
                    'relative px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                    isActive(item.path, item.exact)
                      ? 'text-white'
                      : 'text-gray-400 hover:text-white',
                    item.comingSoon && 'cursor-default'
                  )}
                >
                  {item.label}
                  {item.comingSoon && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                      Soon
                    </span>
                  )}
                  {isActive(item.path, item.exact) && !item.comingSoon && (
                    <motion.div
                      layoutId="nav-indicator"
                      className="absolute inset-0 bg-white/10 rounded-lg -z-10"
                      transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* CTA Button */}
            <div className="hidden md:flex items-center gap-4">
              <Link
                to="/login"
                className="text-sm font-medium text-gray-400 hover:text-white transition-colors"
              >
                Sign In
              </Link>
              <a
                href="#waitlist"
                onClick={(e) => {
                  e.preventDefault();
                  document.querySelector('input[type="email"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  setTimeout(() => document.querySelector<HTMLInputElement>('input[type="email"]')?.focus(), 500);
                }}
                className="ws-btn-primary text-sm"
              >
                Join Waitlist
              </a>
            </div>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-gray-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden bg-black/95 backdrop-blur-xl border-t border-gray-800"
          >
            <div className="px-6 py-4 space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.comingSoon ? '#' : item.path}
                  onClick={(e) => {
                    if (item.comingSoon) e.preventDefault();
                    else setMobileMenuOpen(false);
                  }}
                  className={cn(
                    'block px-4 py-3 text-sm font-medium rounded-lg transition-colors',
                    isActive(item.path, item.exact)
                      ? 'bg-white/10 text-white'
                      : 'text-gray-400',
                    item.comingSoon && 'opacity-50'
                  )}
                >
                  {item.label}
                  {item.comingSoon && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400">
                      Coming Soon
                    </span>
                  )}
                </Link>
              ))}
              <div className="pt-4 border-t border-gray-800 space-y-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-gray-400 hover:text-white"
                >
                  Sign In
                </Link>
                <a
                  href="#waitlist"
                  onClick={(e) => {
                    e.preventDefault();
                    setMobileMenuOpen(false);
                    setTimeout(() => {
                      document.querySelector('input[type="email"]')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      setTimeout(() => document.querySelector<HTMLInputElement>('input[type="email"]')?.focus(), 500);
                    }, 300);
                  }}
                  className="block ws-btn-primary text-center text-sm"
                >
                  Join Waitlist
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </nav>

      {/* Main content */}
      <main className="relative pt-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="relative border-t border-gray-800/50 mt-32">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <Link to="/website" className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center">
                  <span className="text-black font-bold text-lg">A</span>
                </div>
                <span className="font-semibold text-lg text-white">Acme</span>
              </Link>
              <p className="text-sm text-gray-500">
                Modern driver management platform for transportation companies.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link to="/website/credentialing" className="text-sm text-gray-400 hover:text-white transition-colors">Credentialing</Link></li>
                <li><Link to="/website/pricing" className="text-sm text-gray-400 hover:text-white transition-colors">Pricing</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2">
                <li><span className="text-sm text-gray-400">About</span></li>
                <li><span className="text-sm text-gray-400">Contact</span></li>
                <li><span className="text-sm text-gray-400">Careers</span></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2">
                <li><span className="text-sm text-gray-400">Privacy Policy</span></li>
                <li><span className="text-sm text-gray-400">Terms of Service</span></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Acme. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <span className="text-sm text-gray-500">Built for the modern fleet</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
