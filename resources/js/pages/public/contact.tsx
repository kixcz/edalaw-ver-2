import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, Send, Headphones } from 'lucide-react';
import PublicLayout from '@/layouts/public-layout';

export default function Contact() {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        // For now, create a mailto link
        const mailtoLink = `mailto:info@edalaw.gov.ph?subject=${encodeURIComponent(formData.subject)}&body=${encodeURIComponent(
            `Name: ${formData.name}\nEmail: ${formData.email}\n\nMessage:\n${formData.message}`
        )}`;
        window.location.href = mailtoLink;
    };

    return (
        <PublicLayout title="Contact Us - eDalaw" description="Get in touch with the eDalaw support team">
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
                            <Headphones className="w-3.5 h-3.5" />
                            GET IN TOUCH
                        </div>
                        <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">
                            Contact <span className="text-orange-400">Us</span>
                        </h1>
                        <p className="text-lg text-white/70 leading-relaxed max-w-3xl mx-auto">
                            We're here to help with any questions or concerns
                        </p>
                    </div>
                </div>
            </section>

            {/* Contact Info & Form */}
            <section className="py-20 bg-white">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                        {/* Contact Information */}
                        <div className="lg:col-span-1">
                            <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <MapPin className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Office Address</h3>
                                        <p className="text-gray-600">
                                            BJMP National Headquarters<br />
                                            Quezon City, Philippines
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Mail className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Email Address</h3>
                                        <p className="text-gray-600">info@edalaw.gov.ph</p>
                                        <p className="text-gray-600">support@edalaw.gov.ph</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Phone className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Phone Number</h3>
                                        <p className="text-gray-600">+63 (2) 8911-5210</p>
                                        <p className="text-gray-600">+63 (2) 8911-5211</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <Clock className="w-5 h-5 text-orange-600" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-1">Office Hours</h3>
                                        <p className="text-gray-600">
                                            Monday - Friday: 8:00 AM - 5:00 PM<br />
                                            Saturday: 8:00 AM - 12:00 PM<br />
                                            Sunday: Closed
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Inquiry Form */}
                        <div className="lg:col-span-2">
                            <div className="bg-gray-50 p-8 rounded-xl border border-gray-200">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Us a Message</h2>
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div>
                                        <label htmlFor="name" className="block text-sm font-semibold text-gray-700 mb-2">
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                            placeholder="Enter your full name"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                                            Email Address *
                                        </label>
                                        <input
                                            type="email"
                                            id="email"
                                            required
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                            placeholder="your.email@example.com"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="subject" className="block text-sm font-semibold text-gray-700 mb-2">
                                            Subject *
                                        </label>
                                        <input
                                            type="text"
                                            id="subject"
                                            required
                                            value={formData.subject}
                                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                            placeholder="What is this about?"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="message" className="block text-sm font-semibold text-gray-700 mb-2">
                                            Message *
                                        </label>
                                        <textarea
                                            id="message"
                                            required
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            rows={6}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all resize-vertical"
                                            placeholder="Please describe your inquiry in detail..."
                                        />
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-all shadow-md hover:shadow-lg"
                                    >
                                        <Send className="w-5 h-5" />
                                        Send Message
                                    </button>

                                    <p className="text-sm text-gray-600 text-center">
                                        By submitting this form, you agree to our privacy policy and consent to being contacted regarding your inquiry.
                                    </p>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Map Placeholder */}
            <section className="py-20 bg-gray-50">
                <div className="container mx-auto px-4 max-w-7xl">
                    <div className="bg-white rounded-xl shadow-md p-8 text-center border border-gray-200">
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">Visit Our Office</h2>
                        <p className="text-gray-600 mb-6">
                            BJMP National Headquarters, Quezon City, Metro Manila, Philippines
                        </p>
                        <a
                            href="https://maps.google.com/?q=BJMP+National+Headquarters+Quezon+City"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block px-6 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 transition-all"
                        >
                            Open in Google Maps
                        </a>
                    </div>
                </div>
            </section>
        </PublicLayout>
    );
}
