import { Head } from '@inertiajs/react';
import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

import { Button } from '@/components/ui/button';

type VisitProofData = {
    id: number;
    visitor_name: string;
    visitor_email: string;
    inmate_name: string;
    scheduled_date: string;
    scheduled_time: string | null;
    qr_code_data: string | null;
    access_key_expires_at: string | null;
};

type Props = {
    visit: VisitProofData;
};

export default function VisitProof({ visit }: Props) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            <Head title="Proof of Appointment" />
            <style>{`
                @media print {
                    @page { size: 8.5in 14in; margin: 0.5in; }
                    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
                    .visit-proof-print-wrapper a,
                    a[href] { visibility: hidden !important; }
                }
            `}</style>
            <div className="visit-proof-print-wrapper min-h-screen bg-white p-6 print:p-8 print:max-w-[8.5in] print:mx-auto">
                {/* Print button - hidden when printing */}
                <div className="mb-6 flex justify-end print:hidden">
                    <Button onClick={handlePrint} className="gap-2">
                        <Printer className="h-4 w-4" />
                        Print / Save as PDF
                    </Button>
                </div>

                <div className="mx-auto max-w-2xl border border-gray-300 p-8 print:border-gray-800">
                    <div className="mb-8 flex justify-center print:mb-6">
                        <img
                            src="/edalaw_logo.png"
                            alt="EDALaw Logo"
                            className="h-16 w-auto object-contain print:h-14"
                        />
                    </div>
                    <h1 className="mb-2 text-center text-2xl font-bold uppercase tracking-wide text-gray-900">
                        Proof of Appointment
                    </h1>
                    <p className="mb-8 text-center text-sm text-gray-600">
                        Present this document to the officer during your physical visit
                    </p>

                    <div className="space-y-4 text-gray-800">
                        {/* QR Code Display */}
                        {visit.qr_code_data ? (
                            <div className="flex flex-col items-center justify-center border border-gray-300 rounded-lg p-6 bg-gray-50">
                                <QRCodeSVG 
                                    value={visit.qr_code_data}
                                    size={192}
                                    level="H"
                                    includeMargin={true}
                                />
                                <p className="mt-4 text-sm font-medium text-gray-700">Scan this QR code during your physical visit</p>
                                <p className="text-xs text-gray-500 mt-1">Valid for: {visit.scheduled_date}</p>
                            </div>
                        ) : (
                            <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="font-medium">QR Code</span>
                                <span className="text-gray-500">Not available</span>
                            </div>
                        )}

                        <div className="flex justify-between border-b border-gray-200 pb-2">
                            <span className="font-medium">Visitor</span>
                            <span>{visit.visitor_name}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                            <span className="font-medium">Email</span>
                            <span>{visit.visitor_email}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                            <span className="font-medium">Inmate</span>
                            <span>{visit.inmate_name}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                            <span className="font-medium">Scheduled Date</span>
                            <span>{visit.scheduled_date}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-2">
                            <span className="font-medium">Scheduled Time</span>
                            <span>{visit.scheduled_time ?? '—'}</span>
                        </div>
                        {visit.access_key_expires_at && (
                            <div className="flex justify-between border-b border-gray-200 pb-2">
                                <span className="font-medium">Valid until</span>
                                <span>{visit.access_key_expires_at}</span>
                            </div>
                        )}
                    </div>

                    <p className="mt-8 text-center text-xs text-gray-500">
                        This is an official proof of your approved physical visit. Please print and bring this document
                        with you.
                    </p>
                    <p className="mt-2 text-center text-xs font-medium text-gray-700">
                        Visitors must also bring valid IDs (e.g. government-issued ID or birth certificate) to present at the facility.
                    </p>

                    <div className="mt-12 grid grid-cols-2 gap-8 border-t border-gray-200 pt-8 print:mt-16">
                        <div className="flex flex-col">
                            <p className="mb-2 h-6 border-b border-gray-400" aria-hidden="true" />
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                                Name of Visitor
                            </p>
                            <p className="border-b border-gray-400 pb-1 text-base font-medium text-gray-900">
                                {visit.visitor_name}
                            </p>
                        </div>
                        <div className="flex flex-col">
                            <p className="mb-2 h-6 border-b border-gray-400" aria-hidden="true" />
                            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                                Warden
                            </p>
                            <p className="h-6 border-b border-gray-300" aria-hidden="true" />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
