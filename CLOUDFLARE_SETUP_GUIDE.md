# دليل إعداد Cloudflare Pages لمشروع Wasit.pay

لقد قمت بتجهيز المشروع بالكامل للعمل على Cloudflare Pages. اتبع الخطوات التالية في لوحة تحكم Cloudflare لإكمال الربط:

## 1. ربط المستودع
1. سجل الدخول إلى [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. انتقل إلى **Workers & Pages** > **Create application** > **Pages** > **Connect to Git**.
3. اختر مستودع `abdilahdfifi2-afk/Wasit-pay`.

## 2. إعدادات البناء (Build Settings)
أثناء عملية الإعداد، تأكد من ضبط القيم التالية:
- **Framework preset**: `None` (أو اختر `Vite` إذا توفر).
- **Build command**: `npm run build`
- **Build output directory**: `dist/client`
- **Root directory**: `/`

## 3. متغيرات البيئة (Environment Variables)
في قسم **Environment variables (advanced)**، أضف المتغيرات التالية (يمكنك الحصول عليها من مشروع Supabase الخاص بك):

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | رابط مشروع Supabase |
| `VITE_SUPABASE_ANON_KEY` | مفتاح Anon Key الخاص بـ Supabase |
| `NODE_VERSION` | `22` |

## 4. تفعيل Auto Deploy
بمجرد الضغط على **Save and Deploy**، سيقوم Cloudflare ببناء المشروع تلقائياً عند كل عملية `push` لفرع `main`.

## 5. ضبط النطاق المخصص (Custom Domain)
1. بعد نجاح النشر، انتقل إلى تبويب **Custom domains** في صفحة المشروع.
2. اضغط على **Set up a custom domain**.
3. أدخل نطاقك (مثلاً `wasit-pay.com`) واتبع التعليمات لضبط سجلات DNS.

## ملاحظات تقنية:
- تم إضافة ملف `_redirects` لضمان عمل الـ Routing بشكل صحيح (SPA Routing).
- تم إضافة ملف `_headers` لتحسين الأمان والأداء.
- تم ضبط `wrangler.toml` لدعم Cloudflare Workers إذا لزم الأمر في المستقبل.
