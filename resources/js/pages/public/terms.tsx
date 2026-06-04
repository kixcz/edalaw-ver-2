import { FileText } from 'lucide-react';
import PublicLayout from '@/layouts/public-layout';

export default function Terms() {
    return (
        <PublicLayout title="Terms and Conditions - e-Dalaw" description="Read the terms and conditions for using e-Dalaw services">
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
                            <FileText className="w-3.5 h-3.5" />
                            LEGAL
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                            Terms and <span className="text-orange-400">Conditions</span>
                        </h1>
                        <p className="text-lg text-white/70 leading-relaxed max-w-3xl mx-auto">
                            Please read these terms carefully before using e-Dalaw
                        </p>
                    </div>
                </div>
            </section>

            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="prose prose-lg max-w-none">
                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Acceptance of Terms</h2>
                            <p className="text-gray-700 leading-relaxed">
                                By accessing or using e-Dalaw services, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, you may not use our services. We reserve the right to modify these terms at any time, and continued use of the service constitutes acceptance of such modifications.
                            </p>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. User Responsibilities</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                As a user of e-Dalaw, you are responsible for:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                                <li>Providing accurate and complete information during registration</li>
                                <li>Maintaining the confidentiality of your account credentials</li>
                                <li>Complying with all applicable laws and regulations</li>
                                <li>Following facility-specific visitation rules and guidelines</li>
                                <li>Using the service only for legitimate visitation purposes</li>
                                <li>Reporting any unauthorized use of your account</li>
                                <li>Ensuring your devices and internet connection meet technical requirements</li>
                            </ul>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Prohibited Activities</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                You are strictly prohibited from:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                                <li>Attempting to record, screenshot, or capture session content without authorization</li>
                                <li>Sharing your account credentials with others</li>
                                <li>Using the service for illegal purposes or to facilitate criminal activity</li>
                                <li>Harassing, threatening, or intimidating other participants</li>
                                <li>Attempting to bypass security measures or monitoring systems</li>
                                <li>Transmitting malware, viruses, or harmful code</li>
                                <li>Interfering with or disrupting the service infrastructure</li>
                                <li>Using another person's identity or providing false information</li>
                                <li>Attempting to access data or accounts you are not authorized to view</li>
                            </ul>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Monitoring and Recording Disclosures</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                By using e-Dalaw, you acknowledge and consent to the following:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                                <li><strong>All virtual sessions are monitored</strong> by authorized facility staff in real-time</li>
                                <li><strong>All sessions are recorded</strong> for security, compliance, and quality assurance purposes</li>
                                <li><strong>Chat messages are logged</strong> and may be reviewed by monitoring officers</li>
                                <li><strong>Recordings may be used</strong> as evidence in legal or disciplinary proceedings</li>
                                <li><strong>Monitoring officers have the authority</strong> to terminate sessions that violate policies</li>
                            </ul>
                            <p className="text-gray-700 leading-relaxed">
                                These monitoring measures are essential for maintaining security and compliance with correctional facility regulations.
                            </p>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Consequences of Violations</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                Violations of these terms may result in:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                                <li>Immediate termination of the current session</li>
                                <li>Suspension or permanent revocation of visitation privileges</li>
                                <li>Account suspension or termination</li>
                                <li>Reporting to law enforcement authorities</li>
                                <li>Legal action under applicable laws</li>
                                <li>Permanent ban from using e-Dalaw services</li>
                            </ul>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Service Availability</h2>
                            <p className="text-gray-700 leading-relaxed">
                                e-Dalaw services are subject to availability and may be temporarily suspended for maintenance, updates, or security reasons. We strive to maintain high service availability but do not guarantee uninterrupted access. Scheduled maintenance will be announced in advance when possible.
                            </p>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Limitation of Liability</h2>
                            <p className="text-gray-700 leading-relaxed">
                                e-Dalaw and the BJMP shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of or inability to use the service, including but not limited to technical failures, security breaches, or service interruptions.
                            </p>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Governing Law</h2>
                            <p className="text-gray-700 leading-relaxed">
                                These terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any disputes arising from these terms or the use of e-Dalaw services shall be subject to the exclusive jurisdiction of the appropriate courts in the Philippines.
                            </p>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Contact Information</h2>
                            <p className="text-gray-700 leading-relaxed">
                                For questions about these Terms and Conditions, please contact us:
                            </p>
                            <div className="bg-gray-50 p-6 rounded-lg mt-4">
                                <p className="text-gray-700"><strong>Email:</strong> legal@edalaw.gov.ph</p>
                                <p className="text-gray-700"><strong>Phone:</strong> +63 (2) 8911-5210</p>
                                <p className="text-gray-700"><strong>Address:</strong> BJMP National Headquarters, Quezon City, Philippines</p>
                            </div>
                        </div>

                        <div className="mt-12 pt-8 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                                <strong>Last Updated:</strong> June 2026
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
