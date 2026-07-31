import { Link } from '@inertiajs/react';
import { CheckCircle, Globe, Clock, Shield, Users, FileText, Target } from 'lucide-react';
import PublicLayout from '@/layouts/public-layout';
import { services } from '@/routes/public-routes';

export default function Objectives() {
    const objectives = [
        {
            icon: Globe,
            title: 'Improve Visitation Accessibility',
            description: 'Make visitation services available to more families through digital platforms, reducing geographic and logistical barriers.',
        },
        {
            icon: Clock,
            title: 'Streamline Scheduling Processes',
            description: 'Automate and simplify the visitation request and approval workflow, reducing wait times and administrative overhead.',
        },
        {
            icon: Shield,
            title: 'Enhance Monitoring and Accountability',
            description: 'Implement comprehensive monitoring and recording systems to ensure all sessions comply with regulations and security protocols.',
        },
        {
            icon: FileText,
            title: 'Reduce Administrative Workload',
            description: 'Digitize manual processes to free up staff time for more critical tasks and improve overall operational efficiency.',
        },
        {
            icon: Users,
            title: 'Maintain Secure and Compliant Communications',
            description: 'Ensure all virtual and physical visitations meet security standards while preserving the dignity and privacy of all participants.',
        },
    ];

    return (
        <PublicLayout title="System Objectives - eDalaw" description="Learn about the goals and objectives of the eDalaw platform">
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
                        <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 text-primary text-xs font-semibold tracking-wide px-4 py-1.5 rounded-full mb-6">
                            <Target className="w-3.5 h-3.5" />
                            OUR GOALS
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                            System <span className="text-primary">Objectives</span>
                        </h1>
                        <p className="text-lg text-white/70 leading-relaxed max-w-3xl mx-auto">
                            The goals that drive our platform development and service delivery
                        </p>
                    </div>
                </div>
            </section>

            {/* Objectives List */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="space-y-8 max-w-5xl mx-auto">
                        {objectives.map((objective, index) => {
                            const Icon = objective.icon;
                            return (
                                <div
                                    key={index}
                                    className="flex gap-6 p-8 bg-gray-50 rounded-xl border border-gray-200 hover:border-primary/30 hover:shadow-lg transition-all"
                                >
                                    <div className="flex-shrink-0">
                                        <div className="w-16 h-16 bg-primary/10 rounded-lg flex items-center justify-center">
                                            <Icon className="w-8 h-8 text-primary" />
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3 mb-3">
                                            <CheckCircle className="w-6 h-6 text-green-600" />
                                            <h2 className="text-2xl font-bold text-gray-900">
                                                {objective.title}
                                            </h2>
                                        </div>
                                        <p className="text-lg text-gray-700 leading-relaxed">
                                            {objective.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* Impact Section */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="max-w-4xl mx-auto text-center">
                        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">Our Impact</h2>
                        <p className="text-lg text-gray-600 leading-relaxed mb-8">
                            Through these objectives, eDalaw aims to transform the visitation experience for all stakeholders—
                            from families and visitors to facility staff and administrators. By leveraging technology and
                            innovative processes, we're building a more accessible, secure, and efficient visitation system.
                        </p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-gradient-to-r from-primary to-primary/90">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center text-white">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Explore Our Services</h2>
                        <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                            See how we put these objectives into practice through our comprehensive service offerings
                        </p>
                        <Link
                            href={services()}
                            className="inline-block px-8 py-4 bg-white text-primary font-semibold rounded-lg hover:bg-gray-50 transition-all shadow-lg"
                        >
                            View Services
                        </Link>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
