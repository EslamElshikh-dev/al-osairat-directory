import Image from 'next/image';
import Link from 'next/link';
import { jobAreas } from '@/lib/jobs-geography';
import { getLocalJobs } from '@/lib/jobs';
import { buildPageMetadata } from '@/lib/metadata';
import { siteConfig } from '@/lib/site';
import { JobsBoard } from './jobs-board';
import styles from './jobs.module.css';

export const dynamic = 'force-dynamic';
export const metadata = buildPageMetadata({
  title: 'وظائف سوهاج ومراكزها | فرص العسيرات وقراها والبحث عن عمل',
  description: 'وظائف سوهاج ومراكزها، مع قسم مخصص للعسيرات وقراها. اعرض وظيفة، شارك خبرتك، وابحث عن فرص برابط المصدر وتفاصيل التقديم.',
  path: '/jobs',
});

export default async function JobsPage() {
  const { jobs, available } = await getLocalJobs();
  const places = jobAreas;
  const schema = {
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    name: 'وظائف سوهاج ومراكزها والعسيرات وقراها', url: `${siteConfig.url}/jobs`,
    description: 'فرص عمل وباحثون عن عمل في محافظة سوهاج، مع إبراز مركز العسيرات وقراه.', inLanguage: 'ar-EG',
    mainEntity: { '@type': 'ItemList', itemListElement: jobs.filter((job) => job.kind === 'offer').map((job, index) => ({
      '@type': 'ListItem', position: index + 1, name: job.title, url: `${siteConfig.url}/jobs#job-${job.id}`,
    })) },
  };

  return <main id="main-content" className={styles.page}>
    <section className={styles.hero}>
      <div className={`shell ${styles.heroInner}`}>
        <nav aria-label="مسار التنقل" className={styles.breadcrumb}><Link href="/">الرئيسية</Link><span aria-hidden="true">/</span><span>وظائف سوهاج والعسيرات</span></nav>
        <div className={styles.heroGrid}>
          <div className={styles.heroCopy}>
            <span className={styles.eyebrow}>من العسيرات لحد آخر مركز في سوهاج</span>
            <h1>شغل قريب منك، <em>وفرصة تستاهلك.</em></h1>
            <p>عندك فرصة عمل في سوهاج؟ خلّي أهل المحافظة يعرفوا. بتدوّر على شغل؟ احكي عن خبرتك ومجالك، ويمكن رزقك يكون في العسيرات أو مركز قريب منك. بنراجع مشاركات الأهالي، وبنفحص المصادر العامة كل نص ساعة؛ ورابط المصدر ظاهر مع كل فرصة منقولة.</p>
            <div className={styles.heroActions}><a href="#opportunities">شوف الفرص <span aria-hidden="true">↙</span></a><a href="#participate">اعرض وظيفة أو خبرتك <span aria-hidden="true">←</span></a></div>
          </div>
          <div className={styles.visual} aria-hidden="true">
            <span className={styles.visualRing} />
            <Image src="/images/jobs/job-seekers-duo.webp" alt="" width={840} height={840} priority sizes="(max-width: 760px) 240px, 340px" />
            <span className={styles.visualTag}>بلدنا العسيرات · والفرص في سوهاج كلها</span>
          </div>
        </div>
      </div>
    </section>
    <div className={`shell ${styles.steps}`} aria-label="خطوات قسم الوظائف"><span><b>01</b> اختار العسيرات أو أي مركز في سوهاج</span><span><b>02</b> راجع المصدر واتواصل للتقديم</span><span><b>03</b> شارك فرصتك أو خبرتك</span></div>
    <JobsBoard jobs={jobs} places={places} available={available} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema).replace(/</g, '\\u003c') }} />
  </main>;
}
