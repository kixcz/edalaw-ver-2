import { Head } from '@inertiajs/react';
import { Printer, ShieldCheck, CalendarDays, Clock, User, Mail, Lock, FileDown } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

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

    const handleSaveAsPDF = async () => {
        const element = document.querySelector('.visit-proof-print-wrapper');
        if (!element) return;

        try {
            // Create canvas from HTML
            const canvas = await html2canvas(element as HTMLElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
            });

            // Create PDF
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'px',
                format: [canvas.width, canvas.height],
            });

            // Add image to PDF
            const imgData = canvas.toDataURL('image/png');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
            
            // Download PDF
            pdf.save(`Visit-Proof-VIS-${String(visit.id).padStart(6, '0')}.pdf`);
        } catch (error) {
            console.error('Error generating PDF:', error);
            // Fallback to print dialog
            window.print();
        }
    };

    return (
        <>
            <Head title="Proof of Appointment" />
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap');

                @media print {
                    @page { 
                        size: letter; 
                        margin: 0;
                        @top-left { content: none; }
                        @top-center { content: none; }
                        @top-right { content: none; }
                        @bottom-left { content: none; }
                        @bottom-center { content: none; }
                        @bottom-right { content: none; }
                    }
                    html, body { 
                        margin: 0; 
                        padding: 0; 
                        width: 100%;
                        height: 100%;
                        print-color-adjust: exact; 
                        -webkit-print-color-adjust: exact; 
                    }
                    .no-print { display: none !important; }
                    
                    /* Completely hide all links and URLs */
                    a, a[href], link, script {
                        display: none !important;
                        visibility: hidden !important;
                        opacity: 0 !important;
                        height: 0 !important;
                        width: 0 !important;
                        overflow: hidden !important;
                    }
                    a::before, a::after,
                    a[href]::before, a[href]::after,
                    link::before, link::after {
                        content: none !important;
                        display: none !important;
                    }
                    
                    .print-break { page-break-inside: avoid; }
                    
                    /* Remove all screen-only styling for print */
                    .visit-proof-print-wrapper {
                        max-width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        border: none !important;
                        border-radius: 0 !important;
                        box-shadow: none !important;
                        overflow: visible !important;
                        width: 100% !important;
                    }
                    
                    /* Hide browser default headers/footers */
                    @page :left {
                        @top-left { content: none; }
                        @bottom-left { content: none; }
                    }
                    @page :right {
                        @top-right { content: none; }
                        @bottom-right { content: none; }
                    }
                }

                .doc-font { font-family: 'Inter', sans-serif; }
                .doc-title-font { font-family: 'Playfair Display', serif; }

                .field-row {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 10px 0;
                    border-bottom: 1px solid #E5E7EB;
                }
                .field-row:last-child { border-bottom: none; }
                .field-label {
                    font-size: 10px;
                    font-weight: 600;
                    letter-spacing: 0.06em;
                    text-transform: uppercase;
                    color: #6B7280;
                    line-height: 1.2;
                }
                .field-value {
                    font-size: 13px;
                    font-weight: 500;
                    color: #111827;
                    line-height: 1.3;
                }
                .watermark-bg {
                    position: relative;
                    overflow: hidden;
                }
                .watermark-bg::before {
                    content: 'APPROVED';
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%) rotate(-30deg);
                    font-size: 96px;
                    font-weight: 900;
                    color: rgba(0, 0, 0, 0.03);
                    letter-spacing: 0.15em;
                    pointer-events: none;
                    white-space: nowrap;
                    font-family: 'Inter', sans-serif;
                }
                .qr-container {
                    background: white;
                    border: 1px solid #D1D5DB;
                    border-radius: 8px;
                    padding: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 10px;
                }
                .sig-line {
                    border-bottom: 1px solid #374151;
                    height: 36px;
                    margin-bottom: 6px;
                }
                .sig-label {
                    font-size: 9px;
                    font-weight: 600;
                    letter-spacing: 0.08em;
                    text-transform: uppercase;
                    color: #6B7280;
                }
                .sig-value {
                    font-size: 12px;
                    font-weight: 500;
                    color: #374151;
                    margin-top: 2px;
                }
            `}</style>

            {/* Action Buttons */}
            <div className="no-print mb-6 flex justify-center gap-3 pt-8 doc-font">
                <Button
                    onClick={handlePrint}
                    style={{ background: '#111827', color: 'white' }}
                    className="gap-2 px-6 py-2 rounded-lg font-semibold shadow hover:opacity-90 transition"
                >
                    <Printer className="h-4 w-4" />
                    Print Document
                </Button>
                <Button
                    onClick={handleSaveAsPDF}
                    variant="outline"
                    className="gap-2 px-6 py-2 rounded-lg font-semibold shadow-sm hover:bg-gray-50 transition"
                >
                    <FileDown className="h-4 w-4" />
                    Save as PDF
                </Button>
            </div>

            {/* Document */}
            <div
                className="visit-proof-print-wrapper watermark-bg doc-font mx-auto print:mx-0"
                style={{
                    maxWidth: '680px',
                    background: 'white',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    marginBottom: '40px',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
                }}
            >
                {/* Header */}
                <div
                    className="print-break"
                    style={{ padding: '24px 40px 20px', borderBottom: '2px solid #111827' }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <img
                                src="/edalaw_logo.png"
                                alt="EDALaw"
                                style={{ height: '36px', width: 'auto' }}
                            />
                            <div style={{ width: '1px', height: '32px', background: '#D1D5DB' }} />
                            <img
                                src="/bjmp_logo.png"
                                alt="BJMP"
                                style={{ height: '36px', width: 'auto' }}
                            />
                        </div>
                        <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6B7280', marginBottom: '3px' }}>
                                Document No.
                            </div>
                            <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 700, color: '#111827', letterSpacing: '0.06em' }}>
                                VIS-{String(visit.id).padStart(6, '0')}
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: '16px' }}>
                        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '20px', fontWeight: 700, color: '#111827', letterSpacing: '0.02em' }}>
                            Proof of Visit Appointment
                        </div>
                        <div style={{ fontSize: '11px', color: '#6B7280', marginTop: '3px' }}>
                            Present this document to the officer at the facility entrance.
                        </div>
                    </div>
                </div>

                {/* Privacy Notice */}
                <div style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', padding: '10px 40px', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
                    <ShieldCheck style={{ width: '14px', height: '14px', color: '#6B7280', flexShrink: 0, marginTop: '1px' }} />
                    <div>
                        <div style={{ fontSize: '9px', fontWeight: 700, color: '#374151', marginBottom: '2px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Data Privacy Notice
                        </div>
                        <div style={{ fontSize: '9px', lineHeight: '1.5', color: '#4B5563' }}>
                            Personal information in this document is processed pursuant to the Data Privacy Act of 2012 (RA 10173) solely for visit verification at the BJMP facility. 
                            Your data is kept confidential and not shared with unauthorized third parties. 
                            Presenting this document constitutes consent to verification processing.
                            <br />
                            <span style={{ fontStyle: 'italic' }}>
                                (Ang personal nga impormasyon nga anaa niini nga dokumento giproseso subay sa Data Privacy Act of 2012 (RA 10173) alang lamang sa pagberipika sa pagbisita sa pasilidad sa BJMP. 
                                Ang imong datos magpabiling kompidensyal ug dili ipaambit sa mga dili awtorisadong ikatulong partido. 
                                Ang pagpakita niini nga dokumento nagpasabot sa imong pagtugot sa pagproseso sa impormasyon alang sa beripikasyon.)
                            </span>
                        </div>
                    </div>
                </div>

                {/* Status banner */}
                <div style={{ background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', padding: '8px 40px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldCheck style={{ width: '14px', height: '14px', color: '#059669', flexShrink: 0 }} />
                    <span style={{ fontSize: '11px', fontWeight: 600, color: '#374151' }}>
                        Appointment Confirmed & Approved
                    </span>
                </div>

                {/* Body */}
                <div style={{ padding: '32px 40px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', alignItems: 'start' }}>

                        {/* Left: Fields */}
                        <div className="print-break">
                            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151', marginBottom: '10px', paddingBottom: '6px', borderBottom: '1px solid #E5E7EB' }}>
                                Visit Details
                            </div>

                            <div className="field-row">
                                <div>
                                    <div className="field-label">Visitor</div>
                                    <div className="field-value">{visit.visitor_name}</div>
                                </div>
                            </div>

                            <div className="field-row">
                                <div>
                                    <div className="field-label">Email Address</div>
                                    <div className="field-value" style={{ fontSize: '12px' }}>{visit.visitor_email}</div>
                                </div>
                            </div>

                            <div className="field-row">
                                <div>
                                    <div className="field-label">Person to Visit</div>
                                    <div className="field-value">{visit.inmate_name}</div>
                                </div>
                            </div>

                            <div className="field-row">
                                <div>
                                    <div className="field-label">Scheduled Date</div>
                                    <div className="field-value">{visit.scheduled_date}</div>
                                </div>
                            </div>

                            <div className="field-row">
                                <div>
                                    <div className="field-label">Scheduled Time</div>
                                    <div className="field-value">{visit.scheduled_time ?? '—'}</div>
                                </div>
                            </div>

                            {visit.access_key_expires_at && (
                                <div className="field-row">
                                    <div>
                                        <div className="field-label">Valid Until</div>
                                        <div className="field-value" style={{ fontSize: '12px' }}>{visit.access_key_expires_at}</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: QR Code */}
                        <div className="print-break" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <div style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#374151', marginBottom: '10px', alignSelf: 'flex-start', paddingBottom: '6px', borderBottom: '1px solid #E5E7EB' }}>
                                Scan to Verify
                            </div>

                            {visit.qr_code_data ? (
                                <div className="qr-container" style={{ width: '100%' }}>
                                    <QRCodeSVG
                                        value={visit.qr_code_data}
                                        size={150}
                                        level="H"
                                        includeMargin={false}
                                        fgColor="#111827"
                                    />
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '11px', fontWeight: 500, color: '#374151' }}>
                                            Show to facility officer
                                        </div>
                                        <div style={{ fontSize: '10px', color: '#6B7280', marginTop: '2px' }}>
                                            Valid for {visit.scheduled_date}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ border: '1px dashed #D1D5DB', borderRadius: '8px', padding: '20px', textAlign: 'center', color: '#9CA3AF', fontSize: '12px', width: '100%' }}>
                                    QR code not available
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Requirements */}
                    <div style={{ marginTop: '20px', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '6px', padding: '12px 16px' }}>
                        <div style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#374151', marginBottom: '5px' }}>
                            Required on the Day of Visit
                        </div>
                        <div style={{ fontSize: '10px', color: '#4B5563', lineHeight: '1.6' }}>
                            Bring a valid government-issued ID or birth certificate. This document must be presented together with your ID at the facility entrance. No entry without proper identification.
                        </div>
                    </div>

                    {/* Signature block */}
                    <div style={{ marginTop: '32px', borderTop: '1px solid #E5E7EB', paddingTop: '24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                        <div>
                            <div className="sig-line" />
                            <div className="sig-label">Visitor's Signature over Printed Name</div>
                            <div className="sig-value">{visit.visitor_name}</div>
                        </div>
                        <div>
                            <div className="sig-line" />
                            <div className="sig-label">Warden / Authorized Officer</div>
                            <div className="sig-value" style={{ color: '#D1D5DB' }}>Signature & Designation</div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div
                    style={{
                        background: '#F9FAFB',
                        borderTop: '1px solid #E5E7EB',
                        padding: '14px 40px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                    }}
                >
                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontWeight: 500 }}>
                        Issued via EDALaw Visitor Management System
                    </div>
                    <div style={{ fontSize: '10px', color: '#9CA3AF', fontFamily: 'monospace', letterSpacing: '0.08em' }}>
                        REF: VIS-{String(visit.id).padStart(6, '0')}
                    </div>
                </div>
            </div>
        </>
    );
}
