import { Link } from '@inertiajs/react';
import { Shield, Heart, Eye, Lock } from 'lucide-react';
import PublicLayout from '@/layouts/public-layout';
import { about } from '@/routes/public-routes';

export default function About() {
    return (
        <PublicLayout title="About e-Dalaw" description="Learn more about the e-Dalaw visitation management platform">
            {/* Hero Section */}
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
                        <div className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-semibold tracking-wide px-4 py-1.5 rounded-full mb-6">
                            <Lock className="w-3.5 h-3.5" />
                            ABOUT US
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                            About <span className="text-orange-400">e-Dalaw</span>
                        </h1>
                        <p className="text-lg text-white/70 leading-relaxed max-w-3xl mx-auto">
                            Understanding our mission to connect families through secure technology
                        </p>
                    </div>
                </div>
            </section>

            {/* What is e-Dalaw */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="max-w-4xl mx-auto">
                        <h2 className="text-3xl font-bold text-gray-900 mb-6">What is e-Dalaw?</h2>
                        <p className="text-lg text-gray-700 leading-relaxed mb-6">
                            e-Dalaw is a secure visitation management platform designed to facilitate approved virtual and physical
                            visitation activities through structured scheduling, supervision, and documentation mechanisms.
                        </p>
                        <p className="text-lg text-gray-700 leading-relaxed">
                            Developed in partnership with the Bureau of Jail Management and Penology (BJMP), e-Dalaw represents
                            a modern approach to maintaining family connections while ensuring security, compliance, and
                            accountability in all visitation activities.
                        </p>
                    </div>
                </div>
            </section>

            {/* Vision & Mission */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        {/* Vision */}
                        <div className="bg-white p-8 rounded-xl shadow-md border-2 border-orange-100">
                            <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mb-6">
                                <Eye className="w-8 h-8 text-orange-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Vision</h2>
                            <p className="text-lg text-gray-700 leading-relaxed">
                                To provide accessible, secure, and accountable visitation services through digital innovation.
                            </p>
                        </div>

                        {/* Mission */}
                        <div className="bg-white p-8 rounded-xl shadow-md border-2 border-orange-100">
                            <div className="w-16 h-16 bg-orange-100 rounded-lg flex items-center justify-center mb-6">
                                <Heart className="w-8 h-8 text-orange-600" />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">Our Mission</h2>
                            <p className="text-lg text-gray-700 leading-relaxed">
                                To improve visitation management through technology while promoting security, efficiency,
                                transparency, and family connectivity.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Values */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Our Core Values</h2>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            The principles that guide everything we do
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Shield className="w-8 h-8 text-orange-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Security</h3>
                            <p className="text-gray-600">
                                Every session is monitored and recorded to ensure safety and compliance
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Heart className="w-8 h-8 text-orange-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Compassion</h3>
                            <p className="text-gray-600">
                                We understand the importance of family connections and strive to make them accessible
                            </p>
                        </div>

                        <div className="text-center p-6">
                            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Eye className="w-8 h-8 text-orange-600" />
                            </div>
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">Transparency</h3>
                            <p className="text-gray-600">
                                Clear processes and accountable systems build trust with all stakeholders
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-gradient-to-r from-orange-500 to-orange-600">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center text-white">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Learn More About Our Services</h2>
                        <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                            Discover how e-Dalaw can help you stay connected with your loved ones
                        </p>
                        <Link
                            href={about.objectives()}
                            className="inline-block px-8 py-4 bg-white text-orange-600 font-semibold rounded-lg hover:bg-gray-50 transition-all shadow-lg"
                        >
                            View System Objectives
                        </Link>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
