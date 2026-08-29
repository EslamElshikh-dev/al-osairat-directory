import { ImageResponse } from 'next/og';

export const dynamic = 'force-static';

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#102a24',
          color: '#ffffff',
          padding: '72px 82px',
          direction: 'rtl',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
            <div
              style={{
                width: 74,
                height: 74,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 24,
                border: '2px solid #d7a83c',
                color: '#f2d27d',
                fontSize: 34,
                fontWeight: 800,
              }}
            >
              ع
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <div style={{ fontSize: 30, fontWeight: 800 }}>دليل العسيرات</div>
              <div style={{ fontSize: 19, color: '#c7d5d0' }}>الموسوعة المحلية لمركز العسيرات</div>
            </div>
          </div>
          <div
            style={{
              display: 'flex',
              padding: '10px 18px',
              borderRadius: 999,
              background: 'rgba(255,255,255,.08)',
              border: '1px solid rgba(255,255,255,.14)',
              color: '#f2d27d',
              fontSize: 18,
              fontWeight: 700,
            }}
          >
            سوهاج · مصر
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 930 }}>
          <div style={{ display: 'flex', color: '#f2d27d', fontSize: 24, fontWeight: 700 }}>
            دليل محلي منظم وقابل للتحديث
          </div>
          <div style={{ display: 'flex', fontSize: 62, lineHeight: 1.18, fontWeight: 900 }}>
            الخدمات والأنشطة والقرى في مركز العسيرات
          </div>
          <div style={{ display: 'flex', fontSize: 25, lineHeight: 1.6, color: '#d7e2de' }}>
            أطباء وصيدليات ومحلات وحرفيون ومطاعم ومواصلات وخدمات مهمة في مكان واحد.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid rgba(255,255,255,.16)',
            paddingTop: 24,
            fontSize: 19,
          }}
        >
          <div style={{ display: 'flex', color: '#ffffff', fontWeight: 700 }}>usayrat.online</div>
          <div style={{ display: 'flex', color: '#aebfba' }}>مركز العسيرات وقراه · محافظة سوهاج</div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    },
  );
}
