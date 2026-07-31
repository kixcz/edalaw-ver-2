import { Link } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { 
    Video, 
    Building, 
    Shield, 
    ChevronRight, 
    Users, 
    CalendarCheck, 
    CheckCircle, 
    Lock,
    ShieldCheck,
    ArrowRight,
    Phone,
    Clock,
    MessageSquare,
    Eye,
    Radio
} from 'lucide-react';
import PublicLayout from '@/layouts/public-layout';
import { register, login, faq, contact, howItWorks } from '@/routes/public-routes';

export default function Home() {
    const [privacyAccepted, setPrivacyAccepted] = useState(false);

    useEffect(() => {
        // Always show privacy modal on page load
        setPrivacyAccepted(false);
    }, []);

    const handlePrivacyAccept = () => {
        setPrivacyAccepted(true);
    };

    const features = [
        {
            icon: Video,
            title: 'Virtual Visitation',
            description: 'Participate in approved and supervised virtual visits through secure video conferencing.',
        },
        {
            icon: Building,
            title: 'Physical Visitation',
            description: 'Schedule and manage on-site visits through a streamlined approval process.',
        },
        {
            icon: Phone,
            title: 'e-Burol Services',
            description: 'Request and participate in supervised virtual wake sessions for eligible family members.',
        },
        {
            icon: Shield,
            title: 'Secure Monitoring',
            description: 'All virtual sessions are monitored and recorded to ensure compliance and accountability.',
        },
    ];

    const steps = [
        { 
            number: 1, 
            title: 'Register', 
            description: 'Create your account',
            icon: Users
        },
        { 
            number: 2, 
            title: 'Submit Request', 
            description: 'Apply for visitation',
            icon: MessageSquare
        },
        { 
            number: 3, 
            title: 'Await Approval', 
            description: 'Wait for verification',
            icon: Clock
        },
        { 
            number: 4, 
            title: 'Schedule', 
            description: 'Receive confirmation',
            icon: CalendarCheck
        },
        { 
            number: 5, 
            title: 'Join Session', 
            description: 'Connect securely',
            icon: Video
        },
    ];

    const stats = [
        { value: '10,000+', label: 'Total Visits', icon: Users },
        { value: '7,500+', label: 'Virtual Sessions', icon: Video },
        { value: '8,200+', label: 'Approved Requests', icon: CheckCircle },
    ];

    const faqPreview = [
        {
            question: 'Who can register?',
            answer: 'Authorized visitors who meet visitation requirements can register for an account.',
        },
        {
            question: 'Is the session monitored?',
            answer: 'Yes. All virtual sessions are monitored and recorded for security and compliance.',
        },
        {
            question: 'Do PDLs need accounts?',
            answer: 'No. The system does not create PDL accounts. Access is provided through secure tunnel codes.',
        },
    ];

    return (
        <PublicLayout title="eDalaw - Secure Visitation Management" description="Connecting Families Through Secure and Monitored Visitation">
            {/* Privacy Modal */}
            {!privacyAccepted && (
                <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm z-[9999] flex items-center justify-center p-5 animate-fadeIn">
                    <div className="bg-white rounded-2xl max-w-[560px] w-full shadow-2xl overflow-hidden animate-slideUp">
                        <div className="bg-gradient-to-br from-primary to-primary/80 p-7 flex items-start gap-4">
                            <div className="w-12 h-12 min-w-[48px] bg-white/20 rounded-xl flex items-center justify-center">
                                <ShieldCheck className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h2 className="text-white text-xl font-bold leading-tight">Privacy Notice & Consent</h2>
                                <p className="text-white/85 text-xs mt-1">Your privacy matters to us</p>
                            </div>
                        </div>
                        <div className="p-7">
                            <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                                eDalaw collects and processes personal data in accordance with the Data Privacy Act. 
                                By using this platform, you consent to:
                            </p>
                            <ul className="pl-5 mb-4 space-y-2">
                                {[
                                    'Collection of visitor identification details',
                                    'Recording of virtual visitation sessions',
                                    'Storage of visitation history and logs',
                                    'Monitoring for security compliance'
                                ].map((item, idx) => (
                                    <li key={idx} className="text-sm text-slate-600 flex items-start gap-2">
                                        <span className="text-primary mt-1.5 min-w-[6px] h-1.5 rounded-full bg-primary block"></span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <Link 
                                href="/privacy" 
                                className="inline-flex items-center gap-1.5 text-primary text-sm font-semibold mb-5 hover:opacity-75 transition-opacity"
                            >
                                <ShieldCheck className="w-4 h-4" />
                                Read Full Privacy Policy
                            </Link>
                        </div>
                        <div className="px-7 pb-7">
                            <button
                                onClick={handlePrivacyAccept}
                                className="w-full py-3.5 bg-gradient-to-r from-primary to-primary/80 text-white rounded-xl font-bold text-base hover:-translate-y-0.5 hover:shadow-lg transition-all shadow-lg shadow-primary/35"
                            >
                                I Understand
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <section className="relative min-h-screen bg-gradient-to-br from-slate-800 via-[#2A3550] to-[#1A2240] flex items-center pt-24 pb-20 overflow-hidden">
                {/* Background Elements */}
                <div className="absolute w-[700px] h-[700px] -top-[200px] -right-[100px] rounded-full bg-[radial-gradient(circle,rgba(242,100,25,0.15),transparent_70%)]" />
                <div className="absolute w-[400px] h-[400px] -bottom-[100px] left-[5%] rounded-full bg-[radial-gradient(circle,rgba(244,140,61,0.1),transparent_70%)]" />
                <div 
                    className="absolute inset-0 pointer-events-none opacity-30"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
                        backgroundSize: '60px 60px'
                    }}
                />

                <div className="relative z-10 max-w-[1200px] mx-auto px-[5%] w-full grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                    {/* Left Content */}
                    <div>
                        <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 text-primary text-xs font-semibold tracking-wide px-4 py-1.5 rounded-full mb-6">
                            <Lock className="w-3.5 h-3.5" />
                            SECURE PLATFORM
                        </div>
                        
                        <h1 className="text-[clamp(2.2rem,4.5vw,3.4rem)] font-extrabold text-white leading-tight mb-6">
                            Secure Visitation
                            <br />
                            Management <span className="text-primary">Portal</span>
                        </h1>
                        
                        <p className="text-base text-white/70 max-w-[500px] mb-9 leading-relaxed">
                            A digital visitation platform facilitating virtual and physical visitation scheduling, 
                            supervised communication, and secure record management for correctional facilities.
                        </p>
                        
                        <div className="flex flex-wrap gap-3.5 mb-5">
                            <Link
                                href={register()}
                                className="px-8 py-3.5 bg-primary text-white rounded-xl font-bold text-base inline-flex items-center gap-2 hover:-translate-y-0.5 hover:shadow-xl transition-all shadow-lg shadow-primary/40 no-underline"
                            >
                                Get Started
                                <ArrowRight className="w-5 h-5" />
                            </Link>
                            <Link
                                href={howItWorks()}
                                className="px-8 py-3.5 bg-white/8 text-white rounded-xl font-semibold border-[1.5px] border-white/25 hover:bg-white/14 hover:border-white/50 transition-all no-underline"
                            >
                                Learn More
                            </Link>
                        </div>
                        
                        <div className="flex items-center gap-1.5 text-xs text-white/45">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Data privacy protected • End-to-end encrypted</span>
                        </div>
                    </div>

                    {/* Right Visual - Hero Card */}
                    <div className="flex justify-center">
                        <div className="bg-white/6 border border-white/10 rounded-[20px] p-7 backdrop-blur-md w-full max-w-[380px] shadow-2xl">
                            {/* Card Header */}
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2.5 h-2.5 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.6)] animate-pulse" />
                                    <span className="text-xs text-white/70 font-medium">System Online</span>
                                </div>
                                <div className="bg-primary/20 text-primary text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide">
                                    LIVE
                                </div>
                            </div>

                            <div className="text-white/50 text-[10px] font-semibold tracking-widest uppercase mb-1.5">
                                Next Session
                            </div>
                            <div className="text-white text-base font-bold mb-5">
                                Virtual Visit - Room A12
                            </div>

                            <div className="h-px bg-white/8 my-4" />

                            <div className="space-y-2.5 mb-4">
                                <div className="flex justify-between">
                                    <span className="text-xs text-white/45">Scheduled</span>
                                    <span className="text-xs text-white/85 font-semibold">Today, 2:00 PM</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-white/45">Duration</span>
                                    <span className="text-xs text-white/85 font-semibold">30 minutes</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-xs text-white/45">Status</span>
                                    <span className="text-xs text-green-400 font-semibold">Confirmed</span>
                                </div>
                            </div>

                            <div className="bg-white/8 rounded-full h-1.5 mb-1.5 overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full w-[65%]" />
                            </div>
                            <div className="text-xs text-white/45 mb-4">65% slots filled today</div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                    <div className="text-base font-extrabold text-primary">24</div>
                                    <div className="text-[10px] text-white/45 mt-0.5">Active</div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                    <div className="text-base font-extrabold text-primary">156</div>
                                    <div className="text-[10px] text-white/45 mt-0.5">Today</div>
                                </div>
                                <div className="bg-white/5 rounded-xl p-3 text-center">
                                    <div className="text-base font-extrabold text-primary">98%</div>
                                    <div className="text-[10px] text-white/45 mt-0.5">Uptime</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-[90px] bg-white dark:bg-gray-900 transition-colors duration-300">
                <div className="max-w-[1200px] mx-auto px-[5%]">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3.5 border border-primary/20">
                            <Shield className="w-3.5 h-3.5" />
                            Core Features
                        </div>
                        <h2 className="text-[clamp(1.7rem,3vw,2.4rem)] font-extrabold text-slate-800 dark:text-white leading-tight mb-3.5">
                            Key <span className="text-primary">Features</span>
                        </h2>
                        <p className="text-base text-slate-600 dark:text-gray-400 max-w-[580px] mx-auto leading-relaxed">
                            Comprehensive visitation management tools designed for security, efficiency, and accessibility
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature) => {
                            const Icon = feature.icon;
                            return (
                                <div
                                    key={feature.title}
                                    className="group p-8 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary hover:shadow-xl transition-all duration-300 cursor-default"
                                >
                                    <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-primary transition-colors">
                                        <Icon className="w-8 h-8 text-primary group-hover:text-white transition-colors" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-slate-800 dark:text-white mb-3">{feature.title}</h3>
                                    <p className="text-slate-600 dark:text-gray-400 leading-relaxed text-sm">{feature.description}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section className="py-[90px] bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
                <div className="max-w-[1200px] mx-auto px-[5%]">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3.5 border border-primary/20">
                            <Radio className="w-3.5 h-3.5" />
                            Process
                        </div>
                        <h2 className="text-[clamp(1.7rem,3vw,2.4rem)] font-extrabold text-slate-800 dark:text-white leading-tight mb-3.5">
                            How It <span className="text-primary">Works</span>
                        </h2>
                        <p className="text-base text-slate-600 dark:text-gray-400 max-w-[580px] mx-auto leading-relaxed">
                            Simple, secure, and streamlined process for managing visitations
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-8">
                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            return (
                                <div key={step.number} className="relative">
                                    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md text-center relative z-10 hover:shadow-lg transition-shadow">
                                        <div className="w-14 h-14 bg-primary text-white rounded-xl flex items-center justify-center mx-auto mb-4">
                                            <Icon className="w-6 h-6" />
                                        </div>
                                        <div className="text-xs font-bold text-primary mb-1">STEP {step.number}</div>
                                        <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-2">{step.title}</h3>
                                        <p className="text-xs text-slate-600 dark:text-gray-400">{step.description}</p>
                                    </div>
                                    {index < steps.length - 1 && (
                                        <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-0">
                                            <ChevronRight className="w-8 h-8 text-primary/40" />
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="text-center mt-12">
                        <Link
                            href={howItWorks()}
                            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-all no-underline"
                        >
                            Learn More
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Statistics Section */}
            <section className="py-[90px] bg-gradient-to-r from-primary to-primary/90">
                <div className="max-w-[1200px] mx-auto px-[5%]">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {stats.map((stat) => {
                            const Icon = stat.icon;
                            return (
                                <div 
                                    key={stat.label} 
                                    className="text-center text-white"
                                >
                                    <div className="w-16 h-16 bg-white/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                                        <Icon className="w-8 h-8" />
                                    </div>
                                    <div className="text-4xl md:text-5xl font-extrabold mb-2">{stat.value}</div>
                                    <div className="text-base opacity-90">{stat.label}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* FAQ Preview Section */}
            <section className="py-[90px] bg-white dark:bg-gray-900 transition-colors duration-300">
                <div className="max-w-[1200px] mx-auto px-[5%]">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3.5 border border-primary/20">
                            <MessageSquare className="w-3.5 h-3.5" />
                            Support
                        </div>
                        <h2 className="text-[clamp(1.7rem,3vw,2.4rem)] font-extrabold text-slate-800 dark:text-white leading-tight mb-3.5">
                            Frequently Asked <span className="text-primary">Questions</span>
                        </h2>
                        <p className="text-base text-slate-600 dark:text-gray-400 max-w-[580px] mx-auto leading-relaxed">
                            Quick answers to common questions about eDalaw
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        {faqPreview.map((item, index) => (
                            <div
                                key={index}
                                className="p-6 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-primary/30 dark:hover:border-primary/50 transition-colors"
                            >
                                <h3 className="text-base font-semibold text-slate-800 dark:text-white mb-3">{item.question}</h3>
                                <p className="text-slate-600 dark:text-gray-400 leading-relaxed text-sm">{item.answer}</p>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <Link
                            href={faq()}
                            className="inline-flex items-center gap-2 px-6 py-3 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary/10 transition-all no-underline"
                        >
                            View All FAQs
                            <ChevronRight className="w-5 h-5" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Contact CTA Section */}
            <section className="py-[90px] bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
                <div className="max-w-[1200px] mx-auto px-[5%]">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 md:p-12 border border-gray-200 dark:border-gray-700">
                        <div className="text-center max-w-3xl mx-auto">
                            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-bold tracking-widest uppercase px-4 py-1.5 rounded-full mb-3.5 border border-primary/20 mx-auto w-fit">
                                <Phone className="w-3.5 h-3.5" />
                                Support
                            </div>
                            <h2 className="text-[clamp(1.7rem,3vw,2.4rem)] font-extrabold text-slate-800 dark:text-white leading-tight mb-3.5">
                                Need <span className="text-primary">Help?</span>
                            </h2>
                            <p className="text-base text-slate-600 dark:text-gray-400 mb-8 leading-relaxed">
                                Our support team is here to assist you with any questions or concerns about eDalaw
                            </p>
                            <Link
                                href={contact()}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-md hover:shadow-lg no-underline"
                            >
                                Contact Us
                                <ChevronRight className="w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="py-[90px] bg-gradient-to-br from-slate-800 to-slate-700 text-white">
                <div className="max-w-[1200px] mx-auto px-[5%]">
                    <div className="text-center max-w-3xl mx-auto">
                        <h2 className="text-[clamp(1.7rem,3vw,2.4rem)] font-extrabold mb-6">
                            Ready to Get <span className="text-primary">Started?</span>
                        </h2>
                        <p className="text-base text-white/70 mb-10 leading-relaxed">
                            Join thousands of families who are already using eDalaw to stay connected with their loved ones
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href={register()}
                                className="px-8 py-4 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-all shadow-lg hover:shadow-xl no-underline"
                            >
                                Create Account
                            </Link>
                            <Link
                                href={login()}
                                className="px-8 py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white hover:text-slate-800 transition-all no-underline"
                            >
                                Login to Account
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
