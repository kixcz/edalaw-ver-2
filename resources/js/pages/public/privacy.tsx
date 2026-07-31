import { ShieldCheck } from 'lucide-react';
import PublicLayout from '@/layouts/public-layout';

export default function Privacy() {
    return (
        <PublicLayout title="Data Privacy Policy - eDalaw" description="Learn how eDalaw protects your personal information">
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
                            <ShieldCheck className="w-3.5 h-3.5" />
                            PRIVACY
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                            Data Privacy <span className="text-primary">Policy</span>
                        </h1>
                        <p className="text-lg text-white/70 leading-relaxed max-w-3xl mx-auto">
                            Your privacy and data security are our top priorities
                        </p>
                    </div>
                </div>
            </section>

            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="prose prose-lg max-w-none">
                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Privacy Policy Overview</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                eDalaw is committed to protecting the privacy and personal information of all users in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173). This policy outlines how we collect, use, store, and protect your personal data.
                            </p>
                            <p className="text-gray-700 leading-relaxed">
                                By using eDalaw services, you consent to the data practices described in this policy. We regularly review our privacy practices to ensure compliance with current regulations and industry standards.
                            </p>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Data Processing Notice</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                We collect and process the following types of information:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                                <li><strong>Personal Identification:</strong> Name, date of birth, government-issued ID numbers</li>
                                <li><strong>Contact Information:</strong> Email address, phone number, physical address</li>
                                <li><strong>Visitation Records:</strong> Visit history, session recordings, chat logs</li>
                                <li><strong>Technical Data:</strong> IP addresses, browser information, device identifiers</li>
                                <li><strong>Relationship Data:</strong> Information about your relationship to persons deprived of liberty</li>
                            </ul>
                            <p className="text-gray-700 leading-relaxed">
                                All data is processed for the purposes of facilitating secure visitation services, maintaining security protocols, and complying with legal requirements.
                            </p>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. User Rights</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                Under the Data Privacy Act of 2012, you have the following rights:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                                <li><strong>Right to be Informed:</strong> Know how your data is collected and used</li>
                                <li><strong>Right to Access:</strong> Request copies of your personal data</li>
                                <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete information</li>
                                <li><strong>Right to Erasure:</strong> Request deletion of your data under certain conditions</li>
                                <li><strong>Right to Data Portability:</strong> Receive your data in a portable format</li>
                                <li><strong>Right to Object:</strong> Object to certain types of data processing</li>
                                <li><strong>Right to Lodge Complaints:</strong> File complaints with the National Privacy Commission</li>
                            </ul>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Consent Information</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                By registering for and using eDalaw services, you provide explicit consent for:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                                <li>Collection and processing of your personal information</li>
                                <li>Recording and monitoring of virtual visitation sessions</li>
                                <li>Storage of visitation records and communication logs</li>
                                <li>Sharing of information with authorized facility personnel</li>
                                <li>Use of your contact information for service-related communications</li>
                            </ul>
                            <p className="text-gray-700 leading-relaxed">
                                You may withdraw consent at any time by contacting our Data Protection Officer, though this may affect your ability to use certain services.
                            </p>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Data Security Measures</h2>
                            <p className="text-gray-700 leading-relaxed mb-4">
                                We implement industry-standard security measures to protect your data:
                            </p>
                            <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                                <li>End-to-end encryption for all virtual sessions</li>
                                <li>Secure storage with access controls</li>
                                <li>Regular security audits and vulnerability assessments</li>
                                <li>Staff training on data protection protocols</li>
                                <li>Incident response procedures for data breaches</li>
                            </ul>
                        </div>

                        <div className="mb-12">
                            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Contact Information</h2>
                            <p className="text-gray-700 leading-relaxed">
                                For privacy-related inquiries or to exercise your rights, contact our Data Protection Officer at:
                            </p>
                            <div className="bg-gray-50 p-6 rounded-lg mt-4">
                                <p className="text-gray-700"><strong>Email:</strong> privacy@edalaw.gov.ph</p>
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
