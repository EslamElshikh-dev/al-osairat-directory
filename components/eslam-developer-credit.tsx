import './eslam-developer-credit.css';

// Website design/development credit. Editorial authors and business rights stay separate.
const developerCredit = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person",
      "@id": "https://www.eslam-elshikh.com/#person",
      "name": "إسلام الشيخ",
      "alternateName": [
        "المهندس إسلام الشيخ",
        "Eslam Elshikh"
      ],
      "url": "https://www.eslam-elshikh.com/",
      "sameAs": [
        "https://github.com/EslamElshikh-dev"
      ]
    },
    {
      "@type": "WebSite",
      "@id": "https://usayrat.online#website",
      "url": "https://usayrat.online",
      "creator": {
        "@id": "https://www.eslam-elshikh.com/#person"
      },
      "creditText": "تصميم وبرمجة وتطوير الموقع: المهندس إسلام الشيخ — https://www.eslam-elshikh.com/",
      "name": "دليل العسيرات"
    }
  ]
};

export function EslamDeveloperSignature({ english = false }: { english?: boolean }) {
  return (<>
    <script id="eslam-developer-credit-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(developerCredit).replace(/</g, '\\u003c') }} />
    <a className="developer-signature eslam-credit" data-eslam-signature="v1" href="https://www.eslam-elshikh.com/" target="_blank" rel="noopener noreferrer" dir={english ? 'ltr' : 'rtl'} aria-label={english ? 'Eslam Elshikh — website design and development (opens in a new tab)' : 'موقع المهندس إسلام الشيخ — تصميم وبرمجة وتطوير الموقع، يفتح في تبويب جديد'}>
      <span className="eslam-credit__mark" aria-hidden="true"><img src="data:image/webp;base64,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" width={30} height={30} loading="lazy" decoding="async" alt="" /></span>
      <span className="eslam-credit__copy"><span className="eslam-credit__role">{english ? 'Design & development' : 'تصميم وتطوير'}</span><strong className="eslam-credit__name">{english ? 'Eng. Eslam Elshikh' : 'المهندس إسلام الشيخ'}</strong></span>
      <svg className="eslam-credit__arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 3h6v6M10 14 21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" /></svg>
    </a>
  </>);
}
