import Link from 'next/link';
import { homeFaq } from '@/lib/faq';
import { BrandMark } from './site-shell';

export function FaqSection() {
  return (
    <section className="section section--faq" aria-labelledby="faq-title">
      <div className="shell faq-shell">
        <div className="faq-intro">
          <span className="faq-intro__mark" aria-hidden="true"><BrandMark compact /></span>
          <span className="eyebrow eyebrow--dark">الأسئلة الشائعة</span>
          <h2 id="faq-title">أسئلة مهمة عن دليل العسيرات</h2>
          <p>
            إجابات مختصرة وواضحة عن نطاق التغطية، طريقة البحث، مصادر البيانات،
            والفرق بين بيانات الدليل المحلي والسجلات المرتبطة بخرائط Google.
          </p>
          <div className="faq-intro__links">
            <Link href="/directory" className="button button--primary">استكشف الدليل</Link>
            <Link href="/villages" className="button button--ghost">تصفح القرى</Link>
          </div>
        </div>

        <div className="faq-list">
          {homeFaq.map((item, index) => (
            <details className="faq-item" key={item.question} open={index === 0}>
              <summary>
                <span className="faq-item__number">{String(index + 1).padStart(2, '0')}</span>
                <span>{item.question}</span>
                <span className="faq-item__plus" aria-hidden="true">+</span>
              </summary>
              <div className="faq-item__answer">
                <p>{item.answer}</p>
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
