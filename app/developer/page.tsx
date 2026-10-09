import type { Metadata } from 'next';
import Image from '@/components/site-image';
import Link from 'next/link';
import { DeveloperChapterNav } from '@/components/developer-chapter-nav';
import { DeveloperWorkShowcase } from '@/components/developer-work-showcase';
import { developerChapters } from '@/lib/developer-chapters';
import { developerProjects } from '@/lib/developer-profile';
import { siteConfig } from '@/lib/site';
import { buildPageMetadata } from '@/lib/metadata';
import styles from './developer.module.css';

const pagePath = '/developer';
const portraitPath = '/images/developer/eslam-elshikh.jpg';

export const metadata: Metadata = buildPageMetadata({
  title: 'إسلام الشيخ | Eslam Elshikh — مطور دليل العسيرات',
  description: 'إسلام الشيخ | Eslam Elshikh، مهندس أمن سيبراني ومطور برمجيات وويب في الرياض، وابن العسيرات بسوهاج. تعرّف على دوره في تطوير دليل العسيرات وأعماله وملفاته المهنية.',
  path: pagePath,
  imageUrl: portraitPath, imageAlt: 'المهندس إسلام الشيخ، مطوّر دليل العسيرات',
});

const stops = [
  { number: '٠١', title: 'البداية في الرياض', detail: 'وُلد إسلام في مدينة الرياض بالمملكة العربية السعودية يوم ٢١ أبريل ١٩٩٨. تبدأ سيرته من المدينة التي شهدت ميلاده، والتي يرتبط بها أيضًا جانب من مسيرته في السوق السعودي.' },
  { number: '٠٢', title: 'الجذور في العسيرات', detail: 'هو ابن مركز العسيرات بمحافظة سوهاج في مصر. يظل هذا الانتماء حاضرًا في تعريفه بنفسه، وفي اهتمامه بالمشروعات المحلية؛ ومن بينها دليل وموسوعة العسيرات الذي يبدأ به عرض أعماله.' },
  { number: '٠٣', title: 'دراسة هندسة الحاسبات', detail: 'حصل على بكالوريوس هندسة الحاسبات والمعلومات، تخصص أمن المعلومات، من جامعة ٦ أكتوبر. وتأتي هذه الدراسة ضمن مساره الذي جمع بين المعرفة الهندسية والعمل في البرمجة وتطوير التجارب الرقمية.' },
  { number: '٠٤', title: 'التخصص في الأمن السيبراني', detail: 'واصل دراسته بالحصول على دبلومة الأمن السيبراني من الجامعة العربية المفتوحة. وهكذا اجتمع تخصص الأمن السيبراني مع خلفيته في هندسة الحاسبات والمعلومات ضمن سيرته المهنية.' },
];

const companies = [
  { number: '٠١', sector: 'المقاولات العامة', title: 'شركة تعاود', detail: 'من الشركات الكبرى التي عمل معها، بفرعيها في الرياض والدمام. يمثل حضورها في سيرته جانبًا من عمله مع قطاع المقاولات العامة في السوق السعودي.' },
  { number: '٠٢', sector: 'العقارات', title: 'شركة الأرجان العقارية', detail: 'عمل أيضًا مع شركة الأرجان العقارية الضخمة، في امتداد لمسيرته مع جهات تنتمي إلى قطاعات مختلفة، ومنها القطاع العقاري.' },
  { number: '٠٣', sector: 'الأشعة التشخيصية', title: 'معامل سما سكان', detail: 'من الجهات التي عمل معها في مدينة الرياض. ويضيف مجال الأشعة التشخيصية إلى تنوع القطاعات والشركات التي تضمها سيرته.' },
  { number: '٠٤', sector: 'الذكاء الاصطناعي', title: 'شركة باودي لابز', detail: 'تضم مسيرته شركة باودي لابز للذكاء الاصطناعي، إلى جانب شركات وجهات أخرى، بما يعكس اتساع المجالات التي حضر فيها عمله.' },
];

const schema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'ProfilePage',
      '@id': `${siteConfig.url}${pagePath}/#profile`,
      url: `${siteConfig.url}${pagePath}/`,
      name: 'المهندس إسلام الشيخ — عن المطوّر',
      inLanguage: 'ar-EG',
      dateModified: '2026-10-09T07:28:59+03:00',
      description: 'السيرة المهنية والأعمال المنشورة لإسلام الشيخ، مطور هذا الدليل المحلي.',
      mainEntity: { '@id': 'https://www.eslam-elshikh.com/#person' },
    },
    {
      '@type': 'Person',
      '@id': 'https://www.eslam-elshikh.com/#person',
      mainEntityOfPage: { '@id': `${siteConfig.url}${pagePath}/#profile` },
      identifier: { '@type': 'PropertyValue', propertyID: 'Wikidata', value: 'Q138800449', url: 'https://www.wikidata.org/wiki/Q138800449' },
      name: 'إسلام الشيخ',
      alternateName: ['Eslam Elshikh', 'Islam Elshikh', 'Eslam El Sheikh', 'اسلام الشيخ', 'المهندس إسلام الشيخ', 'EslamElshikh-dev'],
      birthDate: '1998-04-21',
      birthPlace: { '@type': 'Place', name: 'الرياض، المملكة العربية السعودية' },
      homeLocation: { '@type': 'Place', name: 'مركز العسيرات، محافظة سوهاج، مصر' },
      alumniOf: [
        { '@type': 'CollegeOrUniversity', name: 'جامعة ٦ أكتوبر' },
        { '@type': 'CollegeOrUniversity', name: 'الجامعة العربية المفتوحة' },
      ],
      hasCredential: [
        {
          '@type': 'EducationalOccupationalCredential',
          name: 'بكالوريوس هندسة الحاسبات والمعلومات، تخصص أمن المعلومات',
          credentialCategory: 'Bachelor degree',
          about: { '@type': 'DefinedTerm', name: 'أمن المعلومات', sameAs: 'https://www.wikidata.org/wiki/Q189900' },
          recognizedBy: { '@type': 'CollegeOrUniversity', name: 'جامعة ٦ أكتوبر' },
        },
        {
          '@type': 'EducationalOccupationalCredential',
          name: 'دبلوم الأمن السيبراني',
          credentialCategory: 'Diploma',
          about: { '@type': 'DefinedTerm', name: 'الأمن السيبراني', sameAs: 'https://www.wikidata.org/wiki/Q3510521' },
          recognizedBy: { '@type': 'CollegeOrUniversity', name: 'الجامعة العربية المفتوحة' },
        },
      ],
      image: `${siteConfig.url}${portraitPath}`,
      url: `${siteConfig.url}${pagePath}/`,
      description: 'مهندس أمن سيبراني ومطور برمجيات وويب، يطور أدلة محلية وتجارب رقمية عربية.',
      jobTitle: ['مهندس أمن سيبراني', 'مطور برمجيات', 'مطور ويب'],
      knowsAbout: ['Cybersecurity', 'Web Development', 'Local Search'],
      sameAs: [
        'https://www.eslam-elshikh.com/',
        'https://github.com/EslamElshikh-dev',
        'https://me.developers.google.com/u/EslamElshikh',
        'https://www.wikidata.org/wiki/Q138800449',
        'https://www.youtube.com/@remoesoo10',
        'https://x.com/remoesoo10',
      ],
    },
    {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'الرئيسية', item: `${siteConfig.url}/` },
        { '@type': 'ListItem', position: 2, name: 'عن المطوّر', item: `${siteConfig.url}${pagePath}/` },
      ],
    },
    {
      '@type': 'ItemList',
      name: 'مشروعات مختارة للمهندس إسلام الشيخ',
      numberOfItems: developerProjects.length,
      itemListElement: developerProjects.map((project, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: project.title,
        url: project.external ? project.href : `${siteConfig.url}${project.href}`,
      })),
    },
  ],
};

export default function DeveloperPage() {
  return (
    <main id="main-content" className={`page-main ${styles.page}`}>
      <section className={styles.hero} aria-labelledby="developer-title">
        <div className={`shell ${styles.heroInner}`}>
          <div className={styles.heroCopy}>
            <nav className={styles.breadcrumbs} aria-label="مسار الصفحة"><Link href="/">دليل العسيرات</Link><span aria-hidden="true">/</span><span>عن المطوّر</span></nav>
            <p className={styles.eyebrow}><span aria-hidden="true">✦</span> من الرياض إلى جذور الصعيد</p>
            <h1 id="developer-title">المهندس إسلام الشيخ<br /><em>ابن العسيرات، سوهاج.</em></h1>
            <p className={styles.eyebrow} lang="en" dir="ltr">Eslam Elshikh</p>
            <p className={styles.heroLead}>مهندس أمن سيبراني ومطور برمجيات وويب في الرياض، وعضو في برنامج Google للمطورين؛ جذوره في العسيرات بمحافظة سوهاج. هنا تلاقي حكايته من أول المكان اللي وُلد فيه والبلد اللي ينتمي لها، مرورًا بالدراسة والعمل، وصولًا إلى مشروعات رقمية تهم أهل المكان والشركات على حد سواء.</p>
            <div className={styles.heroActions}>
              <a className={styles.primaryAction} href="#story">اقرأ السيرة <span aria-hidden="true">↓</span></a>
              <a className={styles.secondaryAction} href="#selected-work">تصفّح الأعمال <span aria-hidden="true">←</span></a>
            </div>
            <div className={styles.heroFacts} aria-label="نبذة سريعة">
              <div><span>الميلاد</span><strong>٢١ أبريل ١٩٩٨ · الرياض</strong></div>
              <div><span>الجذور</span><strong>العسيرات · سوهاج</strong></div>
            </div>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.portraitFrame}>
              <Image src={portraitPath} alt="صورة المهندس إسلام الشيخ" fill priority sizes="(max-width: 840px) 86vw, 42vw" />
              <span className={styles.portraitCaption}>إسلام الشيخ <small>مهندس أمن سيبراني ومطور</small></span>
            </div>
            <div className={styles.placeBadge}><span>الرياض</span><i aria-hidden="true">↔</i><span>العسيرات</span></div>
            <span className={styles.visualMark} aria-hidden="true">إس</span>
            <span className={styles.portraitNote} aria-hidden="true">من الرياض إلى العسيرات</span>
          </div>
        </div>
      </section>

      <DeveloperChapterNav />

      <section className={`shell ${styles.routeMap}`} aria-labelledby="route-map-title">
        <div className={styles.routeMapHeading}>
          <div><p className={styles.kicker}>دليلك في الصفحة</p><h2 id="route-map-title">خُد السكة <em>اللي تهمّك.</em></h2></div>
          <p>الحكاية أوسع من المسمّى الوظيفي. خمس محطات توصّلك من جذور إسلام ودراسته إلى خبراته ومشروعاته؛ اختار البداية اللي تناسبك، وكمل من هناك.</p>
        </div>
        <div className={styles.routeCards}>
          {developerChapters.map((chapter) => (
            <a href={`#${chapter.id}`} key={chapter.id} className={styles.routeCard}>
              <span className={styles.routeCardNumber}>{chapter.number}<i aria-hidden="true" /></span>
              <strong>{chapter.title}</strong>
              <span className={styles.routeCardDescription}>{chapter.description}</span>
              <span className={styles.routeCardArrow} aria-hidden="true">↙</span>
            </a>
          ))}
        </div>
      </section>

      <section id="story" className={`shell ${styles.story}`} aria-labelledby="story-title">
        <div className={styles.storyRail}>
          <div className={styles.sectionIndex}><span>٠١ / عن إسلام</span><i /></div>
          <div className={styles.originMark} aria-hidden="true"><strong>١٩٩٨</strong><span>الرياض <i /> العسيرات</span><small>بداية في مكان، وجذور في مكان تاني</small></div>
        </div>
        <div className={styles.storyCopy}>
          <p className={styles.kicker}>عن الإنسان قبل المهنة</p>
          <h2 id="story-title">بدأت الحكاية في الرياض،<br /><em>وجذورها في العسيرات.</em></h2>
          <p>المهندس إسلام الشيخ من مواليد مدينة الرياض بالمملكة العربية السعودية يوم <strong>٢١ أبريل ١٩٩٨</strong>، وهو ابن مركز العسيرات بمحافظة سوهاج في مصر. ما بين الرياض التي وُلد فيها والعسيرات التي ينتمي إليها، تتشكل سيرته من مكانين حاضرين في تعريفه بنفسه. ويظهر هذا الانتماء أيضًا في اهتمامه بمشروعات تتصل بالبلد وأهلها، وفي مقدمتها دليل وموسوعة العسيرات.</p>
          <p>بعيدًا عن عناوين الوظائف، تقدر تقرأ حكايته في هذه الصلة بالمكان: جذور في صعيد مصر، وبداية في الرياض، ومشروعات تنطلق من احتياجات ناس حقيقيين. من هنا يبدو دليل العسيرات قريبًا من دليل نقادة؛ فكلاهما مساحة تمنح المكان وأهله حضورًا رقميًا أوضح، وتقرّب الوصول إلى ما يهمهم.</p>
          <p>حصل على <strong>بكالوريوس هندسة الحاسبات والمعلومات، تخصص أمن المعلومات، من جامعة ٦ أكتوبر</strong>، ثم دبلومة الأمن السيبراني من الجامعة العربية المفتوحة. ويعمل في الأمن السيبراني وتطوير البرمجيات والويب. تتجاور الدراسة والتخصص والعمل في سيرته، مع حضور البرمجة والتطوير في المشروعات التي يعرضها هنا.</p>
          <p>يربط إسلام الشيخ بين الأمن السيبراني وتطوير الويب وتجربة المستخدم والسيو التقني. وتعرض هذه الصفحة مشروعات منشورة يمكن فتحها ومراجعة نطاقها، من الأدلة المحلية إلى مواقع الشركات والخدمات في السعودية.</p>
          <div className={styles.recognition}>
            <div className={styles.recognitionNumber}><span>أعمال منشورة</span><strong>٥</strong><span>مشروعات في هذه الصفحة</span></div>
            <div className={styles.recognitionCopy}>
              <p className={styles.recognitionEyebrow}>مجتمعات المطورين · أعمال قابلة للمراجعة</p>
              <p>يعرض ملفه في برنامج Google للمطورين مشاركته في مجتمعات <strong>Google Maps Platform Innovators وGoogle Cloud Innovators</strong>. وتساعد روابط المشروعات وGitHub وسجل الأعمال في التعرف على خبرته العملية ونطاق التنفيذ.</p>
            </div>
          </div>
          <a className={styles.sectionTrail} href="#journey"><span>المحطة اللي بعدها <strong>الجذور والدراسة</strong></span><i aria-hidden="true">↙</i></a>
        </div>
      </section>

      <section id="journey" className={styles.journey} aria-labelledby="journey-title">
        <div className={`shell ${styles.journeyInner}`}>
          <header className={styles.journeyHeader}><p className={styles.kicker}>٠٢ / محطات واضحة</p><h2 id="journey-title">من الميلاد والجذور<br /><em>إلى الدراسة والتخصص.</em></h2><p>أربع محطات تقرّب الصورة: أين بدأت الحكاية، وأين تمتد الجذور، وكيف دخلت الدراسة والتخصص في تكوين مسيرته. اقراها على مهلك، فكل محطة تكمل اللي قبلها.</p></header>
          <div className={styles.journeyPath}><ol className={styles.timeline}>{stops.map((stop) => <li key={stop.number}><span className={styles.timelineNumber}>{stop.number}</span><div><h3>{stop.title}</h3><p>{stop.detail}</p></div></li>)}</ol><a className={styles.sectionTrail} href="#experience"><span>المحطة اللي بعدها <strong>الخبرة والشركات</strong></span><i aria-hidden="true">↙</i></a></div>
        </div>
      </section>

      <section id="experience" className={`shell ${styles.perspective}`} aria-labelledby="perspective-title">
        <div className={styles.perspectiveIntro}>
          <p className={styles.kicker}>٠٣ / في السوق السعودي</p>
          <h2 id="perspective-title">مجالات مختلفة،<br /><em>ومسيرة تمتد بينها.</em></h2>
          <p>عمل إسلام الشيخ مع شركات كبرى تحقق نجاحات استثنائية، وتنوّعت الجهات التي عمل معها بين المقاولات والعقارات والأشعة التشخيصية والذكاء الاصطناعي. تضم سيرته شركة تعاود للمقاولات العامة بفرعي الرياض والدمام، وشركة الأرجان العقارية الضخمة، ومعامل سما سكان للأشعة التشخيصية في الرياض، وشركة باودي لابز للذكاء الاصطناعي، وغيرهم.</p>
          <p>وراء أسماء الشركات دي مسيرة في قطاعات لها جمهور مختلف واحتياجات مختلفة. وعلى الرغم من هذا التنوع، يظل اهتمامه بالمكان حاضرًا بجوار عمله المهني؛ لذلك تبدأ الأعمال المختارة بمشروع من العسيرات، ثم تنتقل إلى نقادة، قبل أن تمتد إلى مواقع الشركات والخدمات.</p>
          <p className={styles.perspectiveNote}>من العسيرات إلى نقادة، ومن المشروعات المحلية إلى قطاعات الأعمال: تقدر تتبع المسار بنفسك في الجولة اللي جاية.</p>
          <a href="https://me.developers.google.com/u/EslamElshikh" target="_blank" rel="noreferrer me">ملفي على Google للمطورين <span aria-hidden="true">↗</span></a>
          <a className={styles.sectionTrail} href="#selected-work"><span>المحطة اللي بعدها <strong>المشروعات المختارة</strong></span><i aria-hidden="true">↙</i></a>
        </div>
        <div className={styles.companyGrid}>{companies.map((item) => <article key={item.number}><span className={styles.companyNumber}>{item.number}</span><small>{item.sector}</small><h3>{item.title}</h3><p>{item.detail}</p></article>)}</div>
      </section>

      <DeveloperWorkShowcase />

      <section id="connect" className={`shell ${styles.connect}`} aria-labelledby="connect-title">
        <div className={styles.connectMark} aria-hidden="true">إس</div>
        <div>
          <p className={styles.kicker}>٠٥ / تعرّف أكتر</p>
          <h2 id="connect-title">لسه في الحكاية<br /><em>صفحات تانية.</em></h2>
          <p>الحكاية أوسع من المحطات الخمس اللي في الصفحة: بداية في الرياض، وجذور في العسيرات، ودراسة في هندسة الحاسبات والأمن السيبراني، وعمل يمتد من مشروعات تخدم أهل المكان إلى شركات في مجالات متنوعة. الصفحة دي مدخل للتعرّف على إسلام الشيخ من خلال سيرته وبعض أعماله.</p>
          <p>لو حابب تكمل وتطّلع على مشروعات أخرى أو تتابع حضوره الرقمي، تقدر تبدأ من موقعه الشخصي أو صفحته على GitHub. ولو مشروع دليل العسيرات شدّك، فيه صفحة تانية تحكي عن الدليل وفكرته.</p>
          <div className={styles.connectLinks}>
            <a href="https://www.eslam-elshikh.com/" target="_blank" rel="noreferrer me">موقعي الشخصي <span aria-hidden="true">↗</span></a>
            <a href="https://github.com/EslamElshikh-dev" target="_blank" rel="noreferrer me">مشروعاتي على GitHub <span aria-hidden="true">↗</span></a>
            <a href="https://www.wikidata.org/wiki/Q138800449" target="_blank" rel="noreferrer me">إسلام الشيخ على Wikidata <span aria-hidden="true">↗</span></a>
            <a href="https://www.youtube.com/@remoesoo10" target="_blank" rel="noreferrer me">قناتي على YouTube <span aria-hidden="true">↗</span></a>
            <a href="https://www.eslam-elshikh.com/work-evidence/" target="_blank" rel="noreferrer">سجل الأعمال والأدلة <span aria-hidden="true">↗</span></a>
            <Link href="/about">عن دليل العسيرات <span aria-hidden="true">←</span></Link>
          </div>
        </div>
      </section>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
    </main>
  );
}
