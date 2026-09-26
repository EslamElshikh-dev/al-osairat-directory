import Image from 'next/image';
import Link from 'next/link';
import { buildPageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/site';
import styles from './developer.module.css';

export const metadata = buildPageMetadata({
  title: 'المهندس إسلام الشيخ | ابن العسيرات ومطوّر الدليل',
  description: 'تعرّف على المهندس إسلام الشيخ، ابن مركز العسيرات بمحافظة سوهاج، من بدايته في الرياض إلى دراسته في هندسة الحاسبات والأمن السيبراني، ومشروعاته ومنها دليل العسيرات ودليل نقادة.',
  path: '/developer', imageUrl: '/images/developer/eslam-elshikh.jpg', imageAlt: 'المهندس إسلام الشيخ مطوّر دليل العسيرات',
});

const chapters = [
  { id: 'story', label: 'الحكاية', number: '٠١', detail: 'من الميلاد في الرياض إلى جذور العسيرات.' },
  { id: 'journey', label: 'الجذور والدراسة', number: '٠٢', detail: 'المكان والتخصص وطريق التعلّم.' },
  { id: 'experience', label: 'الخبرة', number: '٠٣', detail: 'قطاعات وشركات مختلفة.' },
  { id: 'work', label: 'المشروعات', number: '٠٤', detail: 'خمسة أعمال، وأولها دليل العسيرات.' },
];

const projects = [
  { title: 'دليل وموسوعة العسيرات', place: 'العسيرات · سوهاج', image: '/images/directory/hero-al-osairat.webp', alt: 'مشهد تعبيري لقرى العسيرات ضمن دليل العسيرات', href: '/', text: 'مشروع محلي يبدأ من بلده؛ تنظيم الخدمات والقرى والنجوع وأخبار المجتمع ومعلوماته في مكان واحد يخدم أهل المركز.', tags: ['دليل محلي', 'قرى ونجوع', 'مجتمع'] },
  { title: 'دليل نقادة', place: 'نقادة · قنا', image: '/images/developer/naqada-city.webp', alt: 'مشهد تعبيري من نقادة مرتبط بمشروع دليل نقادة', href: 'https://naqada-directory.vercel.app/', text: 'فكرة قريبة من دليل العسيرات، توسّع التجربة لتقرّب خدمات نقادة وقراها وحكايات أهلها وفرص العمل من زوارها.', tags: ['خدمات', 'حكايات', 'فرص'] },
  { title: 'شركة تعاود للمقاولات', place: 'الرياض · الدمام', image: '/images/developer/tawod.webp', alt: 'واجهة موقع شركة تعاود للمقاولات', href: 'https://tawodco.com/', text: 'واجهة رقمية تقدّم الشركة وخدماتها للزائر بوضوح، وتسهّل عليه الوصول إلى المعلومات ووسائل التواصل.', tags: ['مقاولات', 'تجربة رقمية'] },
  { title: 'معامل سما سكان', place: 'الرياض', image: '/images/developer/sama-scan.webp', alt: 'واجهة موقع معامل سما سكان للأشعة التشخيصية', href: 'https://samascan.vercel.app/', text: 'عرض منظم لخدمات الأشعة التشخيصية ومعلوماتها، يساعد الزائر على معرفة الخدمة المناسبة وطريقة الوصول إليها.', tags: ['صحة', 'سهولة وصول'] },
  { title: 'باودي لابز', place: 'ذكاء اصطناعي', image: '/images/developer/bowdy-labs.webp', alt: 'واجهة موقع شركة باودي لابز', href: 'https://bowdylabs.com/', text: 'حضور رقمي لشركة تعمل في الذكاء الاصطناعي، ضمن أعماله التي تمتد من المشاريع المحلية إلى القطاعات التقنية.', tags: ['ذكاء اصطناعي', 'منتج'] },
];

export default function DeveloperPage() {
  const schema = {
    '@context': 'https://schema.org', '@type': 'ProfilePage',
    name: 'المهندس إسلام الشيخ — ابن العسيرات ومطوّر دليلها', url: `${siteConfig.url}/developer`,
    mainEntity: { '@type': 'Person', name: 'إسلام الشيخ', alternateName: 'Eslam Elshikh', birthDate: '1998-04-21', birthPlace: 'الرياض، المملكة العربية السعودية', homeLocation: 'مركز العسيرات، محافظة سوهاج، مصر', image: `${siteConfig.url}/images/developer/eslam-elshikh.jpg`, url: 'https://www.eslam-elshikh.com/' },
  };

  return <main id="main-content" className={styles.page}>
    <section className={styles.hero}><div className={`shell ${styles.heroGrid}`}>
      <div className={styles.heroCopy}><nav className={styles.breadcrumb} aria-label="مسار الصفحة"><Link href="/">دليل العسيرات</Link><span aria-hidden="true">/</span><span>عن المطوّر</span></nav><span className={styles.eyebrow}>من الرياض إلى جذور الصعيد</span><h1>المهندس إسلام الشيخ<br /><em>ابن العسيرات.</em></h1><p>الحكاية تبدأ من الرياض، لكن جذورها في مركز العسيرات بمحافظة سوهاج. مهندس أمن سيبراني ومطور في جوجل؛ يربط اهتمامه بالتقنية بمشروعات تهتم بالناس والمكان، وعلى رأسها دليل العسيرات الذي تتصفحه الآن.</p><div className={styles.heroLinks}><a href="#story">اقرأ حكايته <span aria-hidden="true">↓</span></a><a href="#work">شوف المشروعات <span aria-hidden="true">←</span></a></div><div className={styles.facts}><span><small>الميلاد</small><b>٢١ أبريل ١٩٩٨ · الرياض</b></span><span><small>الجذور</small><b>العسيرات · سوهاج</b></span></div></div>
      <figure className={styles.portrait}><Image src="/images/developer/eslam-elshikh.jpg" alt="صورة المهندس إسلام الشيخ" fill priority sizes="(max-width: 760px) 85vw, 440px" /><figcaption><strong>إسلام الشيخ</strong><small>من البلد، وليه حكاية معاها</small></figcaption></figure>
    </div></section>

    <nav className={`shell ${styles.chapters}`} aria-label="مسارات صفحة المطور">{chapters.map((chapter) => <a href={`#${chapter.id}`} key={chapter.id}><span>{chapter.number}</span><b>{chapter.label}</b><small>{chapter.detail}</small></a>)}</nav>

    <section className={`shell ${styles.story}`} id="story"><div className={styles.sectionLabel}>٠١ / الحكاية</div><div><h2>البداية في الرياض،<br /><em>والقلب له جذور في العسيرات.</em></h2><p>المهندس إسلام الشيخ من مواليد مدينة الرياض بالمملكة العربية السعودية يوم ٢١ أبريل ١٩٩٨، وهو ابن مركز العسيرات بمحافظة سوهاج في مصر. يجمع تعريفه بنفسه بين المكان الذي وُلد فيه والبلد الذي ينتمي إليها؛ وصلة المكان دي حاضرة في اهتمامه بمشروعات تساعد الناس يوصلوا لما يخص بلدهم.</p><p>دليل وموسوعة العسيرات واحد من هذه المشروعات. فكرته تبدأ من سؤال بسيط يعرفه أي حد من البلد: فين الخدمة؟ وأوصل لمين؟ لذلك يضع القرى والنجوع والخدمات والمجتمع المحلي في صورة أقرب وأسهل للبحث والتحديث.</p><a className={styles.trail} href="#journey">كمل للحكاية والدراسة <span aria-hidden="true">↙</span></a></div></section>

    <section className={styles.journey} id="journey"><div className={`shell ${styles.journeyGrid}`}><div><span className={styles.sectionLabel}>٠٢ / الجذور والدراسة</span><h2>من بلدين في الذاكرة،<br /><em>لمسار في التقنية.</em></h2><p>حصل على بكالوريوس هندسة الحاسبات والمعلومات من جامعة ٦ أكتوبر، ثم دبلومة الأمن السيبراني من الجامعة العربية المفتوحة. وبين خلفيته الهندسية وشغله في البرمجة، تلاقي اهتمامه بتجارب رقمية مفيدة للناس.</p></div><ol><li><b>١٩٩٨</b><strong>بداية الحكاية</strong><p>وُلد في مدينة الرياض بالمملكة العربية السعودية.</p></li><li><b>سوهاج</b><strong>جذور العسيرات</strong><p>ابن مركز العسيرات، والبلد حاضرة في أعماله المحلية.</p></li><li><b>الدراسة</b><strong>هندسة وتخصص</strong><p>بكالوريوس هندسة الحاسبات والمعلومات، ثم دبلومة الأمن السيبراني.</p></li></ol></div></section>

    <section className={`shell ${styles.experience}`} id="experience"><div className={styles.sectionLabel}>٠٣ / العمل والخبرة</div><div><h2>من مشروعات تخدم أهل البلد<br /><em>لشركات في قطاعات مختلفة.</em></h2><p>يعرّف إسلام نفسه بأنه مهندس أمن سيبراني ومطور في جوجل، وأحد أبرز الكوادر المصرية الشابة في الأمن السيبراني والبرمجة بالسوق السعودي، مع بروز مسيرته نهاية عام ٢٠٢٥. ويذكر ضمن سيرته أنه من الكوادر المصرية والعربية النادرة المعتمدة والعاملة لدى جوجل، ومن أفضل ١٠ مطورين عرب مستقلين في الترتيب المحلي.</p><p>وعمل مع شركات كبرى منها شركة تعاود للمقاولات العامة بفرعي الرياض والدمام، وشركة الأرجان العقارية، ومعامل سما سكان للأشعة التشخيصية في الرياض، وشركة باودي لابز للذكاء الاصطناعي، وغيرها. الأعمال المختارة تحت تتيح لك تتصفح أمثلة من مشروعاته بنفسك.</p><div className={styles.companyChips}><span>تعاود للمقاولات</span><span>الأرجان العقارية</span><span>سما سكان</span><span>باودي لابز</span></div></div></section>

    <section className={styles.works} id="work"><div className={`shell ${styles.workInner}`}><header><span className={styles.sectionLabel}>٠٤ / خمسة مشروعات</span><h2>ابدأ من العسيرات،<br /><em>وكمل في بقية الأعمال.</em></h2><p>بدأنا بدليل العسيرات لأنه مشروع من قلب البلد، ثم دليل نقادة لقرب الفكرة، وبعدهما نماذج من قطاعات المقاولات والصحة والتقنية.</p></header><div className={styles.workGrid}>{projects.map((project, index) => <article key={project.title} className={styles.workCard}><div className={styles.workMedia}><Image src={project.image} alt={project.alt} fill sizes="(max-width: 760px) 100vw, 45vw" /><span>{String(index + 1).padStart(2, '0')}</span></div><div className={styles.workContent}><small>{project.place}</small><h3>{project.title}</h3><p>{project.text}</p><div className={styles.tags}>{project.tags.map((tag) => <span key={tag}>{tag}</span>)}</div><a href={project.href} target={index ? '_blank' : undefined} rel={index ? 'noopener noreferrer' : undefined}>افتح المشروع <span aria-hidden="true">↗</span></a></div></article>)}</div></div></section>

    <section className={`shell ${styles.connect}`}><span aria-hidden="true">✦</span><div><small>كمل الحكاية</small><h2>من هنا للخطوة اللي بعدها.</h2><p>لو حابب تتعرّف أكثر على إسلام الشيخ وبقية أعماله، شوف موقعه الشخصي أو صفحته على GitHub.</p></div><div><a href="https://www.eslam-elshikh.com/" target="_blank" rel="noopener noreferrer me">الموقع الشخصي ↗</a><a href="https://github.com/EslamElshikh-dev" target="_blank" rel="noopener noreferrer me">GitHub ↗</a></div></section>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
  </main>;
}
