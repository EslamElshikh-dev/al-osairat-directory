# Phase 7 — Data Authority & Scale

## هدف المرحلة

نقل دليل العسيرات من تجميع بيانات داخل الكود إلى طبقة بيانات مركزية قابلة للتوسع، مع الحفاظ على الواجهة والـ SEO الحاليين وعدم التسبب في توقف أثناء الانتقال.

## المعمارية

- `directory_entities`: النسخة المركزية النشطة لكل سجل في الدليل.
- `directory_entity_sources`: مصادر السجل وحالة التحقق ووقت آخر فحص.
- `search_directory_entities`: بحث Server-side داخل Postgres مع Pagination وفلترة القسم والقرية وترتيب الجودة.
- `sync_directory_entities`: مزامنة إدارية Transactional من البيانات الحالية إلى الطبقة المركزية.
- Trigger على `published_businesses`: يحافظ على تزامن الأنشطة المنشورة الجديدة مع الطبقة المركزية بعد تفعيلها.
- `queryCanonicalDirectory`: Repository في Next.js يستخدم قاعدة البيانات عندما تكون الطبقة المركزية جاهزة، ويعود للمسار القديم تلقائيًا إذا كانت فارغة أو غير متاحة.

## البحث العربي

تم تفعيل `pg_trgm` مع تطبيع عربي داخل PostgreSQL يشمل الهمزات والياء/الألف المقصورة والتاء المربوطة والتشكيل والأرقام العربية. تبقى مرادفات البحث الحالية في طبقة التطبيق ثم ترسل الصيغة الموحدة إلى قاعدة البيانات.

## Data Authority

كل كيان يحتفظ بـ:

- `source`
- `source_status`
- رابط Google Maps / Place ID عند توفره
- `last_updated_at`
- `quality_score`
- مصدر أو أكثر داخل `directory_entity_sources`

درجة الجودة في قاعدة البيانات مطابقة لمنطق لوحة Data Quality الحالي قدر الإمكان، حتى يصبح ترتيب النتائج والتحسين التشغيلي مبنيين على نفس الإشارات.

### Authority Batch #1

لوحة الإدارة تحتوي على Workflow لمعالجة أول 20 سجلًا في Smart Priority Queue. يمكن لمدير الدليل تحديث:

- الهاتف
- الوصف
- Google Maps URL
- Google Place ID
- حالة التحقق
- نوع ووصف ورابط مصدر الإثبات

الحفظ يحدث ثلاث طبقات معًا:

1. `directory_entities` للتأثير الفوري على البحث والنتائج.
2. `listing_overrides` كتصحيح دائم يظل مطبقًا على بيانات الكود وصفحات التفاصيل بعد أي مزامنة لاحقة.
3. `directory_entity_sources` كسجل Evidence مميز بالمفتاح `authority:<entity_id>`.

`sync_directory_entities` يحافظ على سجلات Evidence الخاصة بالـ Authority ولا يحذفها أثناء إعادة المزامنة. بعد كل حفظ يعاد حساب `quality_score` وترتيب `authority_priority` تلقائيًا بواسطة قاعدة البيانات.

قواعد النزاهة تمنع وضع حالة `google_verified` بدون Google Maps كنوع إثبات ومع غياب كل من Maps URL وPlace ID، كما تتطلب حالة `cross_checked` وصفًا أو رابطًا لمصدر الإثبات.

## الأمان

- RLS مفعلة على الجدولين الجديدين.
- الزوار والأعضاء يستطيعون قراءة السجلات النشطة فقط.
- الكتابة والمزامنة محصورة في مدير الدليل.
- RPC البحث والـ Authority Workflow يعملان `SECURITY INVOKER`.
- `get_directory_authority_batch` و`update_directory_authority_record` غير قابلين للتنفيذ بواسطة `anon`.
- وظائف الـ trigger الداخلية موجودة في schema خاصة وغير مكشوفة للـ Data API.

## الأداء

تمت إضافة فهارس:

- GIN Trigram لنص البحث الموحد.
- القسم + حالة النشاط.
- القرية + حالة النشاط.
- حالة المصدر + درجة الجودة.
- مصادر الكيان.

كما أضيفت فهارس Foreign Key مفقودة في جداول الإدارة القديمة لدعم التوسع.

## التفعيل

قبل أول مزامنة، الصفحات تستمر في استخدام بيانات الكود الحالية بدون تغيير للمستخدم. بعد تشغيل **مزامنة قاعدة بيانات الدليل** من لوحة الإدارة، تصبح `/directory` وصفحات الأقسام معتمدة على Database-level Pagination والبحث المركزي.

## Rollback

يمكن تعطيل الطبقة المركزية بإفراغ/تعطيل `directory_entities`؛ Repository في Next.js سيعود تلقائيًا إلى مسار البيانات السابق. لذلك الانتقال قابل للعكس بدون إعادة تصميم الواجهة.

## Supabase migrations applied

- `phase7_data_authority_scale`
- `phase7_search_readiness`
- `phase7_scale_foreign_key_indexes`
- `add_directory_authority_report`
- `authority_batch_workflow`
- `authority_batch_validation`
