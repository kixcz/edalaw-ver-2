import { ShieldCheck } from 'lucide-react';
import { useState, type ReactNode } from 'react';

type Lang = 'en' | 'tl' | 'ceb';

type Translations = Record<Lang, { title: string; body: ReactNode }>;

const LANG_LABELS: Record<Lang, string> = {
    en: 'EN',
    tl: 'Tagalog',
    ceb: 'Bisaya',
};

/* ------------------------------------------------------------------ */
/*  Default translation sets – callers can override via `body` prop   */
/* ------------------------------------------------------------------ */

const DEFAULT_TRANSLATIONS: Record<string, Translations> = {
    /* Generic – used by Suggestions, Appeals, TaggedInmates, ScheduleManagement */
    visitation: {
        en: {
            title: 'Privacy Notice',
            body: (
                <>
                    The information provided in this request will be collected and processed solely for identity verification, scheduling, approval processing, security monitoring, record management, and other legitimate operational purposes. All information shall be handled in accordance with{' '}
                    <strong>Republic Act No. 10173 (Data Privacy Act of 2012)</strong> and applicable privacy and security policies.
                </>
            ),
        },
        tl: {
            title: 'Paunawa sa Privacy',
            body: (
                <>
                    Ang impormasyong ibinigay sa request na ito ay kokolektahin at poproseso lamang para sa pag-verify ng pagkakakilanlan, pag-iskedyul, pagproseso ng apruba, pag-monitor ng seguridad, pamamahala ng rekord, at iba pang lehitimong layunin sa operasyon. Ang lahat ng impormasyon ay pamamahalaan alinsunod sa{' '}
                    <strong>Republic Act No. 10173 (Data Privacy Act of 2012)</strong> at mga naaangkop na patakaran sa privacy at seguridad.
                </>
            ),
        },
        ceb: {
            title: 'Pahibalo sa Privacy',
            body: (
                <>
                    Ang impormasyon nga gihatag niini nga request mocollect ug giproseso lamang alang sa pag-verify sa pagkatawo, pag-iskedyul, pagproseso sa apruba, pag-monitor sa seguridad, pagdumala sa rekord, ug uban pa nga lehitimo nga katuyoan sa operasyon. Ang tanan nga impormasyon gipangdumala sumala sa{' '}
                    <strong>Republic Act No. 10173 (Data Privacy Act of 2012)</strong> ug mga nahisgutan nga patakaran sa privacy ug seguridad.
                </>
            ),
        },
    },

    /* E-Burol specific */
    eburol: {
        en: {
            title: 'Privacy Notice',
            body: (
                <>
                    Information provided in this application, including supporting details and documents, will be processed solely for evaluating, verifying, approving, scheduling, and administering e-Burol requests. Access to submitted information shall be restricted to authorized personnel only, in accordance with{' '}
                    <strong>Republic Act No. 10173 (Data Privacy Act of 2012)</strong>.
                </>
            ),
        },
        tl: {
            title: 'Paunawa sa Privacy',
            body: (
                <>
                    Ang impormasyong ibinigay sa aplikasyong ito, kasama ang mga karagdagang detalye at dokumento, ay poproseso lamang para sa pagtatasa, pag-verify, pag-apruba, pag-iskedyul, at pamamahala ng mga e-Burol request. Ang access sa mga isinumiteng impormasyon ay limitado lamang sa mga awtorisadong personnel, alinsunod sa{' '}
                    <strong>Republic Act No. 10173 (Data Privacy Act of 2012)</strong>.
                </>
            ),
        },
        ceb: {
            title: 'Pahibalo sa Privacy',
            body: (
                <>
                    Ang impormasyon nga gihatag niini nga aplikasyon, lakip ang mga supporting nga detalye ug dokumento, giproseso lamang alang sa pagsusi, pag-verify, pag-apruba, pag-iskedyul, ug pagdumala sa mga e-Burol nga request. Ang access sa gipasa nga impormasyon limitado lamang sa mga awtorisadong personnel, sumala sa{' '}
                    <strong>Republic Act No. 10173 (Data Privacy Act of 2012)</strong>.
                </>
            ),
        },
    },

    /* Appeal specific */
    appeal: {
        en: {
            title: 'Privacy Notice',
            body: (
                <>
                    Information provided in this appeal shall be used exclusively for the review, evaluation, and resolution of the appealed visitation or e-Burol request. All submitted information will be processed only by authorized personnel and handled in accordance with the{' '}
                    <strong>Data Privacy Act of 2012</strong>.
                </>
            ),
        },
        tl: {
            title: 'Paunawa sa Privacy',
            body: (
                <>
                    Ang impormasyong ibinigay sa apela na ito ay gagamitin lamang para sa pagsusuri, pagtatasa, at paglutas ng inapil na visitation o e-Burol request. Ang lahat ng isinumiteng impormasyon ay poproseso lamang ng mga awtorisadong personnel at pamamahalaan alinsunod sa{' '}
                    <strong>Data Privacy Act of 2012</strong>.
                </>
            ),
        },
        ceb: {
            title: 'Pahibalo sa Privacy',
            body: (
                <>
                    Ang impormasyon nga gihatag niini nga apela gamiton lamang alang sa pagsusi, pagtimbang-timbang, ug pagresolba sa giapela nga visitation o e-Burol nga request. Ang tanan nga gipasa nga impormasyon giproseso lamang sa mga awtorisadong personnel ug gipangdumala sumala sa{' '}
                    <strong>Data Privacy Act of 2012</strong>.
                </>
            ),
        },
    },

    /* Video session consent */
    consent: {
        en: {
            title: 'Session Participation Consent',
            body: (
                <>
                    By joining this session, I acknowledge and agree that the session may be monitored, recorded, reviewed, and documented by authorized personnel for security, compliance, audit, documentation, incident investigation, and legitimate operational purposes. I understand that chat messages, audio, video, and other session-related activities may be logged and retained in accordance with applicable policies and retention requirements. I further understand that any violation of applicable rules, regulations, or visitation policies may result in the immediate termination of the session and may be subject to appropriate administrative or legal action.
                </>
            ),
        },
        tl: {
            title: 'Pagpahintulot sa Pakikilahok sa Session',
            body: (
                <>
                    Sa pagsali ko sa session na ito, kinikilala at sinasang-ayunan ko na ang session ay maaaring pantayan, i-record, suriin, at idokumento ng mga awtorisadong personnel para sa seguridad, pagsunod, audit, dokumentasyon, imbestigasyon ng insidente, at iba pang lehitimong layunin sa operasyon. Naiintindihan ko na ang mga chat message, audio, video, at iba pang aktibidad na may kaugnayan sa session ay maaaring i-log at itago alinsunod sa mga naaangkop na patakaran at mga kinakailangan sa pagpapanatili. Naiintindihan ko pa na ang anumang paglabag sa mga naaangkop na patakaran, regulasyon, o patakaran sa visitation ay maaaring magresulta sa agarang pagtigil ng session at maaaring sakupin ang angkop na administratibo o legal na aksyon.
                </>
            ),
        },
        ceb: {
            title: 'Pagtugot sa Pag-apil sa Session',
            body: (
                <>
                    Sa pagsali nako niini nga session, giila ug giuyon nako nga ang session mahimong bantayan, i-record, susihon, ug idokumento sa mga awtorisadong personnel alang sa seguridad, pagsunod, audit, dokumentasyon, imbestigasyon sa insidente, ug uban pa nga lehitimo nga katuyoan sa operasyon. Nasabtan nako nga ang mga chat message, audio, video, ug uban pa nga aktibidad nga may kalabutan sa session mahimong i-log ug tipigan sumala sa mga nahisgutan nga patakaran ug mga kinahanglanon sa pagpadayon. Nasabtan nako pa nga ang bisan unsang paglapas sa mga nahisgutan nga lagda, regulasyon, o patakaran sa visitation mahimong magresulta sa diha-diha nga pagtapos sa session ug mahimong sakop sa angkop nga administratibo o legal nga aksyon.
                </>
            ),
        },
    },

    /* Feedback / Suggestions specific */
    feedback: {
        en: {
            title: 'Privacy Notice',
            body: (
                <>
                    Information submitted through this form will be used solely for service evaluation, complaint investigation, issue resolution, quality improvement, and administrative review. Personal information shall be processed only by authorized personnel in accordance with{' '}
                    <strong>Republic Act No. 10173</strong> and applicable privacy policies.
                </>
            ),
        },
        tl: {
            title: 'Paunawa sa Privacy',
            body: (
                <>
                    Ang impormasyong isinumite sa form na ito ay gagamitin lamang para sa pagsusuri ng serbisyo, imbestigasyon ng reklamo, paglutas ng isyu, pagpapabuti ng kalidad, at pagsusuri ng administrasyon. Ang personal na impormasyon ay poproseso lamang ng mga awtorisadong personnel alinsunod sa{' '}
                    <strong>Republic Act No. 10173</strong> at mga naaangkop na patakaran sa privacy.
                </>
            ),
        },
        ceb: {
            title: 'Pahibalo sa Privacy',
            body: (
                <>
                    Ang impormasyon nga gipasa pinaagi niini nga form gamiton lamang alang sa pagsusi sa serbisyo, pagsuhid sa reklamo, resolusyon sa isyu, pagpaayo sa kalidad, ug pagsusi sa administrasyon. Ang personal nga impormasyon giproseso lamang sa mga awtorisadong personel sumala sa{' '}
                    <strong>Republic Act No. 10173</strong> ug mga nahisgutan nga privacy policies.
                </>
            ),
        },
    },
};

/* ------------------------------------------------------------------ */

type PrivacyNoticeProps = {
    /** Which preset translation set to use */
    variant?: 'visitation' | 'eburol' | 'appeal' | 'feedback' | 'consent';
    /** Optional override – if provided, same text is shown for all languages */
    children?: ReactNode;
};

export function PrivacyNotice({ variant = 'visitation', children }: PrivacyNoticeProps) {
    const [lang, setLang] = useState<Lang>('en');
    const translations = DEFAULT_TRANSLATIONS[variant];

    const title = children ? 'Privacy Notice' : translations[lang].title;
    const body = children ?? translations[lang].body;

    return (
        <div className="rounded-lg border border-border bg-card">
            {/* Header row */}
            <div className="flex items-start justify-between gap-3 px-5 pt-4 pb-2">
                <div className="flex items-center gap-2.5">
                    <ShieldCheck className="h-[18px] w-[18px] shrink-0 text-muted-foreground" />
                    <h4 className="text-[14.5px] font-semibold text-foreground">{title}</h4>
                </div>

                {/* Language tabs */}
                <div className="flex shrink-0 rounded-md border border-border bg-muted p-0.5" role="group" aria-label="Select language">
                    {(Object.keys(LANG_LABELS) as Lang[]).map((key) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setLang(key)}
                            className={`px-2.5 py-1 text-[11px] font-medium rounded-[4px] transition-colors whitespace-nowrap ${
                                lang === key
                                    ? 'bg-card text-foreground shadow-sm'
                                    : 'text-muted-foreground hover:text-foreground'
                            }`}
                            aria-pressed={lang === key}
                        >
                            {LANG_LABELS[key]}
                        </button>
                    ))}
                </div>
            </div>

            {/* Body */}
            <div className="px-5 pb-4 text-[13.5px] leading-relaxed text-muted-foreground">
                {body}
            </div>
        </div>
    );
}
