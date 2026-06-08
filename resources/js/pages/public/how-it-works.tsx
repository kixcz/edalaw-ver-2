import { Link } from '@inertiajs/react';
import { UserPlus, FileText, CheckCircle, Calendar, Video, Key, Building, Clock, Radio } from 'lucide-react';
import PublicLayout from '@/layouts/public-layout';
import { register } from '@/routes/public-routes';

export default function HowItWorks() {
    const virtualSteps = [
        { icon: UserPlus, title: 'Register', desc: 'Create your account' },
        { icon: FileText, title: 'Request Visit', desc: 'Submit application' },
        { icon: CheckCircle, title: 'Approval', desc: 'Wait for verification' },
        { icon: Calendar, title: 'Schedule', desc: 'Get confirmation' },
        { icon: Video, title: 'Session', desc: 'Join securely' },
        { icon: Clock, title: 'Completion', desc: 'Session ends' },
    ];

    const physicalSteps = [
        { icon: UserPlus, title: 'Register', desc: 'Create account' },
        { icon: FileText, title: 'Request', desc: 'Apply for visit' },
        { icon: CheckCircle, title: 'Approval', desc: 'Get approved' },
        { icon: Key, title: 'Access Key', desc: 'Receive key' },
        { icon: Building, title: 'Facility Visit', desc: 'Visit in person' },
    ];

    const eburolSteps = [
        { icon: FileText, title: 'Request', desc: 'Submit request' },
        { icon: CheckCircle, title: 'Verification', desc: 'Eligibility check' },
        { icon: CheckCircle, title: 'Approval', desc: 'Get approved' },
        { icon: Calendar, title: 'Schedule', desc: 'Set date/time' },
        { icon: Video, title: 'Session', desc: 'Virtual wake' },
    ];

    const renderStep = (step: any, index: number, isLast: boolean) => {
        const Icon = step.icon;
        return (
            <div key={index} className="relative">
                <div className="bg-white p-6 rounded-xl shadow-md border-2 border-gray-200 hover:border-orange-300 transition-all text-center">
                    <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Icon className="w-7 h-7 text-orange-600" />
                    </div>
                    <div className="text-sm font-bold text-orange-600 mb-2">Step {index + 1}</div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-600">{step.desc}</p>
                </div>
                {!isLast && (
                    <div className="hidden lg:block absolute top-1/2 -right-6 transform -translate-y-1/2 z-10">
                        <svg className="w-8 h-8 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                    </div>
                )}
            </div>
        );
    };

    return (
        <PublicLayout title="How eDalaw Works" description="Step-by-step guide to using eDalaw visitation services">
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
                        <div className="inline-flex items-center gap-2 bg-orange-500/15 border border-orange-500/30 text-orange-400 text-xs font-semibold tracking-wide px-4 py-1.5 rounded-full mb-6">
                            <Radio className="w-3.5 h-3.5" />
                            PROCESS
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                            How <span className="text-orange-400">eDalaw</span> Works
                        </h1>
                        <p className="text-lg text-white/70 leading-relaxed max-w-3xl mx-auto">
                            Simple, secure, and streamlined processes for all visitation types
                        </p>
                    </div>
                </div>
            </section>

            {/* Virtual Visit Flow */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="mb-12">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Video className="w-6 h-6 text-orange-600" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900">Virtual Visit Process</h2>
                        </div>
                        <p className="text-lg text-gray-600 max-w-3xl">
                            Participate in supervised video visits from anywhere with internet access
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {virtualSteps.map((step, index) => renderStep(step, index, index === virtualSteps.length - 1))}
                    </div>
                </div>
            </section>

            {/* Physical Visit Flow */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="mb-12">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                <Building className="w-6 h-6 text-orange-600" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900">Physical Visit Process</h2>
                        </div>
                        <p className="text-lg text-gray-600 max-w-3xl">
                            Schedule and manage on-site visits through our streamlined approval system
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
                        {physicalSteps.map((step, index) => renderStep(step, index, index === physicalSteps.length - 1))}
                    </div>
                </div>
            </section>

            {/* e-Burol Flow */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="mb-12">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                                </svg>
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900">e-Burol Process</h2>
                        </div>
                        <p className="text-lg text-gray-600 max-w-3xl">
                            Request compassionate virtual wake sessions for eligible family members
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 max-w-5xl mx-auto">
                        {eburolSteps.map((step, index) => renderStep(step, index, index === eburolSteps.length - 1))}
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="py-20 bg-gradient-to-r from-orange-500 to-orange-600">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="text-center text-white">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Start Your Visit Today</h2>
                        <p className="text-lg opacity-90 mb-8 max-w-2xl mx-auto">
                            Create your account and begin the visitation process
                        </p>
                        <Link
                            href={register()}
                            className="inline-block px-8 py-4 bg-white text-orange-600 font-semibold rounded-lg hover:bg-gray-50 transition-all shadow-lg"
                        >
                            Get Started Now
                        </Link>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
