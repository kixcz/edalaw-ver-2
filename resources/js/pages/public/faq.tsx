import { useState } from 'react';
import { ChevronDown, ChevronUp, MessageSquare } from 'lucide-react';
import PublicLayout from '@/layouts/public-layout';

export default function FAQ() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const faqs = [
        {
            question: 'Who can register for e-Dalaw?',
            answer: 'Any authorized visitor who meets the visitation requirements can register for an e-Dalaw account. This includes family members, friends, and legal representatives of persons deprived of liberty (PDLs). You must provide valid identification and meet the facility\'s visitation criteria.',
        },
        {
            question: 'Is the virtual session monitored?',
            answer: 'Yes. All virtual visitation sessions are monitored and recorded by authorized facility staff to ensure compliance with security protocols and regulations. This monitoring helps maintain safety and accountability for all participants.',
        },
        {
            question: 'Do inmates need to create accounts?',
            answer: 'No. The e-Dalaw system does not create accounts for inmates or persons deprived of liberty (PDLs). Instead, they access the system through secure tunnel codes provided during scheduled sessions. This ensures security while maintaining simplicity.',
        },
        {
            question: 'Can I appeal a rejected visitation request?',
            answer: 'Yes. If your visitation request is rejected, you can submit an appeal through the e-Dalaw system. The appeal will be reviewed by the appropriate facility authorities, and you will receive notification of the decision.',
        },
        {
            question: 'What is e-Burol?',
            answer: 'e-Burol is a supervised virtual wake service that allows eligible family members to participate remotely in wake sessions for deceased persons deprived of liberty. This compassionate service is designed for those who cannot attend in person due to geographic or other constraints.',
        },
        {
            question: 'How long does the approval process take?',
            answer: 'The approval timeline varies depending on the type of visitation and facility workload. Generally, virtual visitation requests are processed within 3-5 business days, while physical visitation may take 5-7 business days. You will receive notifications about the status of your request.',
        },
        {
            question: 'What documents do I need to submit?',
            answer: 'Required documents typically include valid government-issued ID, proof of relationship to the PDL (for certain visit types), and completed application forms. Specific requirements may vary by facility and visitation type. The system will guide you through the required documentation during the application process.',
        },
        {
            question: 'Can I reschedule or cancel a visit?',
            answer: 'Yes. You can reschedule or cancel your visitation request through the e-Dalaw platform, subject to facility policies and availability. It\'s recommended to make changes at least 24-48 hours before the scheduled visit.',
        },
        {
            question: 'Is my personal information secure?',
            answer: 'Yes. e-Dalaw complies with the Data Privacy Act of 2012 (Republic Act No. 10173) and implements industry-standard security measures to protect your personal information. All data is encrypted and stored securely, with access limited to authorized personnel only.',
        },
        {
            question: 'What if I experience technical difficulties during a session?',
            answer: 'If you encounter technical issues during a virtual session, contact the facility\'s technical support team immediately. Common issues like connectivity problems can often be resolved quickly. The monitoring officer can also assist you during the session.',
        },
        {
            question: 'Are there any fees for using e-Dalaw?',
            answer: 'Basic visitation services through e-Dalaw are provided free of charge. However, certain services or features may have associated fees as determined by facility policies. Any applicable fees will be clearly communicated before you proceed with the service.',
        },
    ];

    return (
        <PublicLayout title="Frequently Asked Questions - e-Dalaw" description="Find answers to common questions about e-Dalaw visitation services">
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
                            <MessageSquare className="w-3.5 h-3.5" />
                            SUPPORT
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                            Frequently Asked <span className="text-orange-400">Questions</span>
                        </h1>
                        <p className="text-lg text-white/70 leading-relaxed max-w-3xl mx-auto">
                            Find answers to common questions about e-Dalaw services
                        </p>
                    </div>
                </div>
            </section>

            {/* FAQ List */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="space-y-4">
                        {faqs.map((faq, index) => (
                            <div
                                key={index}
                                className="border-2 border-gray-200 rounded-xl overflow-hidden hover:border-orange-300 transition-colors"
                            >
                                <button
                                    onClick={() => setOpenIndex(openIndex === index ? null : index)}
                                    className="w-full flex items-center justify-between p-6 text-left bg-white hover:bg-gray-50 transition-colors"
                                >
                                    <span className="text-lg font-semibold text-gray-900 pr-4">{faq.question}</span>
                                    {openIndex === index ? (
                                        <ChevronUp className="w-6 h-6 text-orange-600 flex-shrink-0" />
                                    ) : (
                                        <ChevronDown className="w-6 h-6 text-gray-400 flex-shrink-0" />
                                    )}
                                </button>
                                {openIndex === index && (
                                    <div className="px-6 pb-6 text-gray-700 leading-relaxed border-t border-gray-100 pt-4">
                                        {faq.answer}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Contact CTA */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="bg-white rounded-2xl shadow-lg p-8 md:p-12 border border-gray-200">
                        <div className="text-center max-w-3xl mx-auto">
                            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Still Have Questions?</h2>
                            <p className="text-lg text-gray-600 mb-8">
                                Our support team is here to help you with any questions not covered in this FAQ
                            </p>
                            <a
                                href="/contact"
                                className="inline-block px-8 py-4 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-all shadow-md hover:shadow-lg"
                            >
                                Contact Us
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
