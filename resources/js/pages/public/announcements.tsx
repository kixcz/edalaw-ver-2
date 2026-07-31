import { Link, Megaphone } from 'lucide-react';
import PublicLayout from '@/layouts/public-layout';

export default function Announcements() {
    const announcements = [
        {
            id: 1,
            title: 'System Maintenance Scheduled - June 15, 2026',
            date: 'June 10, 2026',
            category: 'Maintenance',
            categoryColor: 'bg-blue-100 text-blue-700',
            excerpt: 'eDalaw will undergo scheduled maintenance on June 15, 2026 from 2:00 AM to 6:00 AM. Services may be temporarily unavailable during this period.',
            content: 'We will be performing system upgrades to improve performance and security. Please plan your visitation requests accordingly.',
        },
        {
            id: 2,
            title: 'New Feature: Mobile App Now Available',
            date: 'June 5, 2026',
            category: 'New Features',
            categoryColor: 'bg-green-100 text-green-700',
            excerpt: 'We are excited to announce the launch of the eDalaw mobile application for iOS and Android devices.',
            content: 'Download the app from the App Store or Google Play to access visitation services on the go.',
        },
        {
            id: 3,
            title: 'Updated Visitation Policy Effective July 2026',
            date: 'June 1, 2026',
            category: 'Policy Updates',
            categoryColor: 'bg-purple-100 text-purple-700',
            excerpt: 'New visitation policies will take effect on July 1, 2026, including updated identification requirements and scheduling procedures.',
            content: 'Please review the updated policies in the Terms and Conditions section. All users must acknowledge the new policies before their next visitation.',
        },
        {
            id: 4,
            title: 'Service Advisory: High Volume Period',
            date: 'May 28, 2026',
            category: 'Service Advisories',
            categoryColor: 'bg-primary/10 text-primary',
            excerpt: 'Due to increased demand during the holiday season, visitation slot availability may be limited.',
            content: 'We recommend submitting your visitation requests at least 2 weeks in advance to secure your preferred schedule.',
        },
        {
            id: 5,
            title: 'Enhanced Security Measures Implemented',
            date: 'May 20, 2026',
            category: 'New Features',
            categoryColor: 'bg-green-100 text-green-700',
            excerpt: 'We have implemented additional security measures including two-factor authentication and enhanced session encryption.',
            content: 'These improvements ensure your data and communications remain secure. Users will be prompted to set up 2FA on next login.',
        },
    ];

    return (
        <PublicLayout title="Announcements - eDalaw" description="Stay updated with the latest eDalaw news and announcements">
            {/* Hero */}
            <section className="relative bg-gradient-to-br from-slate-800 via-[#2A3550] to-[#1A2240] py-20 md:py-28 overflow-hidden">
                {/* Background Elements */}
                <div className="absolute w-[600px] h-[600px] -top-[150px] -right-[100px] rounded-full bg-[radial-gradient(circle,rgba(242,100,25,0.12),transparent_70%)]" />
                <div className="absolute w-[350px] h-[350px] -bottom-[80px] left-[10%] rounded-full bg-[radial-gradient(circle,rgba(244,140,61,0.08),transparent_70%)]" />
                <div 
                    className="absolute inset-0 pointer-events-none opacity-20"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                        backgroundSize: '60px 60px'
                    }}
                />
                
                <div className="relative z-10 container mx-auto px-4 max-w-7xl">
                    <div className="max-w-4xl mx-auto text-center">
                        <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 text-primary text-xs font-semibold tracking-wide px-4 py-1.5 rounded-full mb-6">
                            <Megaphone className="w-3.5 h-3.5" />
                            UPDATES
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                            Announce<span className="text-primary">ments</span>
                        </h1>
                        <p className="text-lg text-white/70 leading-relaxed max-w-3xl mx-auto">
                            Stay informed about the latest updates, features, and service advisories
                        </p>
                    </div>
                </div>
            </section>

            {/* Announcements List */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="space-y-8">
                        {announcements.map((announcement) => (
                            <div
                                key={announcement.id}
                                className="bg-white border-2 border-gray-200 rounded-xl p-8 hover:border-primary/30 hover:shadow-lg transition-all"
                            >
                                <div className="flex flex-col md:flex-row md:items-start gap-6">
                                    <div className="flex-1">
                                        <div className="flex flex-wrap items-center gap-3 mb-4">
                                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${announcement.categoryColor}`}>
                                                {announcement.category}
                                            </span>
                                            <span className="text-sm text-gray-500">{announcement.date}</span>
                                        </div>
                                        <h2 className="text-2xl font-bold text-gray-900 mb-3">
                                            {announcement.title}
                                        </h2>
                                        <p className="text-gray-700 leading-relaxed mb-4">
                                            {announcement.excerpt}
                                        </p>
                                        <p className="text-gray-600 leading-relaxed">
                                            {announcement.content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Subscribe CTA */}
            <section className="py-20 bg-gradient-to-r from-primary to-primary/90">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center text-white">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Stay Updated</h2>
                        <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                            Subscribe to our newsletter to receive important announcements and updates directly in your inbox
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-xl mx-auto">
                            <input
                                type="email"
                                placeholder="Enter your email"
                                className="flex-1 px-6 py-4 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-white"
                            />
                            <button className="px-8 py-4 bg-white text-primary font-semibold rounded-lg hover:bg-gray-50 transition-all shadow-lg">
                                Subscribe
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
