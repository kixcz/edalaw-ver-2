import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import { Menu, X, Phone, Mail, MapPin, Moon, Sun } from 'lucide-react';
import { useAppearance } from '@/hooks/use-appearance';
import { home, about, services, howItWorks, faq, contact, login, register, privacy, terms, announcements } from '@/routes/public-routes';

interface PublicLayoutProps {
    children: React.ReactNode;
    title: string;
    description?: string;
}

export default function PublicLayout({ children, title, description }: PublicLayoutProps) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const { resolvedAppearance, updateAppearance } = useAppearance();

    const toggleTheme = () => {
        updateAppearance(resolvedAppearance === 'dark' ? 'light' : 'dark');
    };

    const navLinks = [
        { label: 'About', href: about.index() },
        { label: 'Services', href: services() },
        { label: 'How It Works', href: howItWorks() },
        { label: 'FAQ', href: faq() },
        { label: 'Contact', href: contact() },
    ];

    return (
        <>
            <Head title={title} />
            <div className="min-h-screen flex flex-col bg-white dark:bg-gray-900 transition-colors duration-300">
                {/* Header with Navigation */}
                <header className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-gray-200 dark:border-gray-800 shadow-sm transition-colors duration-300">
                    <div className="container mx-auto px-4 max-w-7xl">
                        <div className="flex items-center justify-between h-16 md:h-20">
                            {/* Logo */}
                            <Link href={home()} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                                <img src="/edalaw_logo.png" alt="e-Dalaw Logo" className="h-10 md:h-12" />
                                <span className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">e-Dalaw</span>
                            </Link>

                            {/* Desktop Navigation */}
                            <nav className="hidden lg:flex items-center gap-8">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-orange-600 dark:hover:text-orange-400 transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                            </nav>

                            {/* Action Buttons */}
                            <div className="hidden lg:flex items-center gap-3">
                                <Link
                                    href={login()}
                                    className="px-5 py-2.5 text-sm font-medium border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 transition-all text-gray-700 dark:text-gray-300"
                                >
                                    Login
                                </Link>
                                <Link
                                    href={register()}
                                    className="px-5 py-2.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors shadow-md hover:shadow-lg"
                                >
                                    Get Started
                                </Link>
                                {/* Theme Toggle */}
                                <button
                                    onClick={toggleTheme}
                                    className="p-2.5 rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    aria-label="Toggle theme"
                                >
                                    {resolvedAppearance === 'dark' ? (
                                        <Sun className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                                    ) : (
                                        <Moon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                                    )}
                                </button>
                            </div>

                            {/* Mobile Menu Toggle */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                aria-label="Toggle menu"
                            >
                                {mobileMenuOpen ? <X className="w-6 h-6 text-gray-700 dark:text-gray-300" /> : <Menu className="w-6 h-6 text-gray-700 dark:text-gray-300" />}
                            </button>
                        </div>
                    </div>

                    {/* Mobile Navigation Menu */}
                    {mobileMenuOpen && (
                        <div className="lg:hidden bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 shadow-lg transition-colors duration-300">
                            <nav className="container mx-auto px-4 py-4 flex flex-col gap-2">
                                {navLinks.map((link) => (
                                    <Link
                                        key={link.href}
                                        href={link.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-orange-50 dark:hover:bg-gray-800 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-colors"
                                    >
                                        {link.label}
                                    </Link>
                                ))}
                                <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-gray-200 dark:border-gray-800">
                                    <Link
                                        href={login()}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="px-4 py-3 text-base font-medium border-2 border-gray-300 dark:border-gray-600 rounded-lg hover:border-orange-500 hover:text-orange-600 dark:hover:text-orange-400 text-center transition-all text-gray-700 dark:text-gray-300"
                                    >
                                        Login
                                    </Link>
                                    <Link
                                        href={register()}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="px-4 py-3 text-base font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 text-center transition-colors"
                                    >
                                        Get Started
                                    </Link>
                                    {/* Mobile Theme Toggle */}
                                    <button
                                        onClick={toggleTheme}
                                        className="flex items-center gap-3 px-4 py-3 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                    >
                                        {resolvedAppearance === 'dark' ? (
                                            <Sun className="w-5 h-5" />
                                        ) : (
                                            <Moon className="w-5 h-5" />
                                        )}
                                        {resolvedAppearance === 'dark' ? 'Light Mode' : 'Dark Mode'}
                                    </button>
                                </div>
                            </nav>
                        </div>
                    )}
                </header>

                {/* Main Content - flex-1 ensures footer pushes to bottom */}
                <main className="flex-1">
                    {children}
                </main>

                {/* Footer */}
                <footer className="bg-gray-900 dark:bg-black text-gray-300 mt-auto transition-colors duration-300">
                    <div className="container mx-auto px-4 max-w-7xl py-12 md:py-16">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                            {/* Brand */}
                            <div>
                                <div className="flex items-center gap-3 mb-4">
                                    <img src="/edalaw_logo.png" alt="e-Dalaw" className="h-10" />
                                    <span className="text-xl font-semibold text-white">e-Dalaw</span>
                                </div>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Connecting families through secure and monitored visitation services.
                                </p>
                            </div>

                            {/* Quick Links */}
                            <div>
                                <h3 className="text-white font-semibold mb-4">Quick Links</h3>
                                <ul className="space-y-2">
                                    <li>
                                        <Link href={about.index()} className="text-sm hover:text-orange-400 transition-colors">
                                            About e-Dalaw
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={services()} className="text-sm hover:text-orange-400 transition-colors">
                                            Services
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={howItWorks()} className="text-sm hover:text-orange-400 transition-colors">
                                            How It Works
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={faq()} className="text-sm hover:text-orange-400 transition-colors">
                                            FAQ
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Legal */}
                            <div>
                                <h3 className="text-white font-semibold mb-4">Legal</h3>
                                <ul className="space-y-2">
                                    <li>
                                        <Link href={privacy()} className="text-sm hover:text-orange-400 transition-colors">
                                            Privacy Policy
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={terms()} className="text-sm hover:text-orange-400 transition-colors">
                                            Terms & Conditions
                                        </Link>
                                    </li>
                                    <li>
                                        <Link href={announcements()} className="text-sm hover:text-orange-400 transition-colors">
                                            Announcements
                                        </Link>
                                    </li>
                                </ul>
                            </div>

                            {/* Contact Info */}
                            <div>
                                <h3 className="text-white font-semibold mb-4">Contact Us</h3>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-2">
                                        <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0 text-orange-400" />
                                        <span className="text-sm">BJMP National Headquarters, Quezon City, Philippines</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 flex-shrink-0 text-orange-400" />
                                        <span className="text-sm">+63 (2) 8911-5210</span>
                                    </li>
                                    <li className="flex items-center gap-2">
                                        <Mail className="w-4 h-4 flex-shrink-0 text-orange-400" />
                                        <span className="text-sm">info@edalaw.gov.ph</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Bottom Bar */}
                        <div className="mt-12 pt-8 border-t border-gray-800">
                            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                                <p className="text-sm text-gray-400">
                                    © {new Date().getFullYear()} e-Dalaw. All rights reserved.
                                </p>
                                <p className="text-sm text-gray-400">
                                    Bureau of Jail Management and Penology (BJMP)
                                </p>
                            </div>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
}
