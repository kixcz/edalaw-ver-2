import { Link } from '@inertiajs/react';
import { Video, Building, Phone, Calendar, Shield } from 'lucide-react';
import PublicLayout from '@/layouts/public-layout';
import { register, howItWorks } from '@/routes/public-routes';

export default function Services() {
    const services = [
        {
            icon: Video,
            title: 'Virtual Visitation',
            description: 'Schedule and participate in supervised video visits with approved PDLs through our secure platform.',
            features: [
                'Secure video conferencing technology',
                'Real-time monitoring by facility staff',
                'Flexible scheduling options',
                'Automated notifications and reminders',
                'Session recording for compliance',
            ],
        },
        {
            icon: Building,
            title: 'Physical Visitation',
            description: 'Apply for on-site visitation appointments at correctional facilities through our streamlined approval process.',
            features: [
                'Online application submission',
                'Digital document verification',
                'Automated approval workflow',
                'Access key generation',
                'Visit history tracking',
            ],
        },
        {
            icon: Phone,
            title: 'e-Burol Services',
            description: 'Request compassionate virtual wake sessions for eligible family members who cannot attend in person.',
            features: [
                'Compassionate service design',
                'Verification of eligibility',
                'Scheduled virtual sessions',
                'Respectful monitoring',
                'Family support resources',
            ],
        },
        {
            icon: Calendar,
            title: 'Visitor Management',
            description: 'Comprehensive tools to manage your schedules, applications, notifications, and visitation history.',
            features: [
                'Dashboard for all visitation activities',
                'Real-time status updates',
                'Document upload and management',
                'Notification center',
                'Visit history and records',
            ],
        },
    ];

    return (
        <PublicLayout title="Services - eDalaw" description="Explore the comprehensive visitation services offered by eDalaw">
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
                            <Shield className="w-3.5 h-3.5" />
                            OUR SERVICES
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                            Our <span className="text-orange-400">Services</span>
                        </h1>
                        <p className="text-lg text-white/70 leading-relaxed max-w-3xl mx-auto">
                            Comprehensive visitation solutions designed for security, accessibility, and family connectivity
                        </p>
                    </div>
                </div>
            </section>

            {/* Services List */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="space-y-16">
                        {services.map((service, index) => {
                            const Icon = service.icon;
                            return (
                                <div
                                    key={index}
                                    className={`flex flex-col ${index % 2 === 1 ? 'lg:flex-row-reverse' : 'lg:flex-row'} gap-8 lg:gap-12 items-center`}
                                >
                                    <div className="flex-1">
                                        <div className="w-20 h-20 bg-orange-100 rounded-xl flex items-center justify-center mb-6">
                                            <Icon className="w-10 h-10 text-orange-600" />
                                        </div>
                                        <h2 className="text-3xl font-bold text-gray-900 mb-4">{service.title}</h2>
                                        <p className="text-lg text-gray-700 leading-relaxed mb-6">
                                            {service.description}
                                        </p>
                                        <ul className="space-y-3">
                                            {service.features.map((feature, idx) => (
                                                <li key={idx} className="flex items-start gap-3">
                                                    <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                    <span className="text-gray-700">{feature}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="flex-1 w-full">
                                        <div className="bg-gradient-to-br from-orange-100 to-gray-100 rounded-2xl p-8 aspect-square flex items-center justify-center">
                                            <Icon className="w-32 h-32 text-orange-300" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-gradient-to-r from-orange-500 to-orange-600">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center text-white">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Get Started?</h2>
                        <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                            Create your account today and start using our visitation services
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                href={register()}
                                className="inline-block px-8 py-4 bg-white text-orange-600 font-semibold rounded-lg hover:bg-gray-50 transition-all shadow-lg"
                            >
                                Create Account
                            </Link>
                            <Link
                                href={howItWorks()}
                                className="inline-block px-8 py-4 bg-transparent text-white font-semibold rounded-lg border-2 border-white hover:bg-white hover:text-orange-600 transition-all"
                            >
                                Learn How It Works
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
