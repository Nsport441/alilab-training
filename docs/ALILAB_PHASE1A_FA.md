# AliLab Training — تحویل فاز ۱A و راهنمای اجرای آزمایشی

تاریخ: ۷ اکتبر ۲۰۲۶. این بسته، تغییر زیرساختی روی openGym است. مبنا در `UPSTREAM.json`
ثبت شده و فایل تغییرات `ALILAB_CHANGES.md` است. فارسی‌سازی و طراحی AliLab در فاز ۱B انجام می‌شود.

## وضعیت واقعی

کد روی شاخهٔ `feature/phase-1a-foundation` در مخزن مستقل محلی آماده شده است.
فورک GitHub، PR خارجی و استقرار Runflare هنوز ساخته/انجام نشده‌اند: اتصال موجود ابزار ساخت
مخزن یا فورک ندارد و مخزن متصلی با نام `alilab-training` پیدا نشد. Docker در محیط بررسی حاضر
نصب نیست. بنابراین اجرای container، DNS، volume واقعی و TLS روی Runflare هنوز تأیید نشده است.
تست API واقعی و بازیابی فایل‌ها با Node 22 انجام شده؛ نتیجهٔ دقیق در `PHASE1A_VALIDATION.json` است.

## تغییرات آماده‌شده

| بخش | رفتار جدید |
| --- | --- |
| کاتالوگ | هر ۱٬۳۲۴ حرکت، ID، متن دستور و دادهٔ عضلات حفظ شده است |
| رسانهٔ عمومی | resolver مرکزی همیشه `null` می‌دهد؛ متغیر CDN نمی‌تواند آن را فعال کند |
| کارت حرکت | بدون تصویر، آیکون ساده نمایش داده می‌شود؛ پنل انیمیشن خالی حذف می‌شود |
| دانلود و build | سرویس downloader، mountهای قدیمی و CDN نسخهٔ موبایل/دمو حذف شده‌اند |
| PWA | مسیرهای قدیمی `/img/` و `/gif/` مسدود و رسانهٔ قدیمی از کش پاک می‌شود |
| API | `undici` روی `7.29.1` pin شده است |
| موبایل | core/CLI/Android/iOS خانوادهٔ Capacitor 7 به `7.6.9` رسیده‌اند؛ APK ساخته نشده است |
| استقرار | API خصوصی، یک writer، volume نام‌دار `/data`، AI و upload خاموش |
| سورس | image وب سورس همین build را در `corresponding-source.tar.gz` ارائه می‌کند |
| CI | تست Node 22؛ انتشار خودکار upstream، Pages و mirror غیرفعال/آرشیو شده‌اند |
| عملیات | دعوت اولیه و تعیین ادمین آفلاین؛ snapshot با checksum و restore در مسیر خالی |

پاک‌سازی کش به رسانه‌های قدیمی مربوط است؛ localStorage و دادهٔ تمرین پاک نمی‌شوند.
رسانهٔ شخصیِ حرکت سفارشی قرارداد جدا دارد؛ upload سرور در پایلوت خاموش است.
registry تأییدشدهٔ تصویر/کلیپ هنوز ساخته نشده؛ مرحلهٔ فعلی عمداً متن‌محور است.

## قدم اول: مخزن GitHub

در [صفحهٔ Fork پروژه](https://github.com/DuarteSantos8/openGym/fork)، حساب خودتان را انتخاب کنید
و نام فورک را `alilab-training` بگذارید. فورک کد باز، مستقلاً از مخزن سایت اصلی AliLab نگهداری می‌شود.
کلید، فایل `.env`، اطلاعات کاربران یا پوشهٔ داده را در آن قرار ندهید.

بستهٔ تحویل دو راه برای ادامه دارد: پوشهٔ `alilab-training/` سورس کامل تغییرکرده است؛ فایل
`phase1a.patch` فقط تفاوت با commit مبنا را دارد. برای حفظ تاریخ upstream، فورک را clone کنید
و patch را روی همان commit مبنا در شاخهٔ feature اعمال کنید. این مثال برای PowerShell است؛
نام حساب را با نام واقعی جایگزین کنید:

```powershell
git clone https://github.com/YOUR_ACCOUNT/alilab-training.git alilab-training-fork
cd alilab-training-fork
git remote add upstream https://github.com/DuarteSantos8/openGym.git
git fetch upstream
git switch -c feature/phase-1a-foundation 31c6795b40fb54130192b5016d7dc29e9f457d30
git apply --check ..\phase1a.patch
git apply ..\phase1a.patch
git add .
git commit -m "Prepare AliLab Training Phase 1A infrastructure"
git push -u origin feature/phase-1a-foundation
```

PR باید داخل فورک AliLab باز شود، نه در مخزن DuarteSantos8. عنوان و متن آماده در
`PHASE1A_PR.md` است. اگر main فورک نسبت به مبنای ممیزی جلو رفته، ابتدا اختلاف upstream را
بررسی و resolve کنید؛ فایل‌ها را کورکورانه روی main تازه جایگزین نکنید.

## آزمایش محلی با Docker Desktop

دستورها از ریشهٔ مخزن و در PowerShell اجرا می‌شوند. این بخش دستور قابل اجرا است؛ در محیط فعلی
Docker اجرا نشده و CI container پس از push باید آن را تأیید کند.

```powershell
Copy-Item .env.example .env
docker compose build
$tools = (Resolve-Path .\scripts).Path
docker compose run --rm --no-deps -v "${tools}:/tools:ro" --entrypoint node api /tools/alilab-admin.mjs invite /data --api-stopped
docker compose up -d --wait
```

دستور invite فقط روی پایگاه تازه اجرا می‌شود و یک کد یک‌بارمصرف می‌دهد؛ آن را خصوصی نگه دارید.
در `http://localhost:8080` با کد دعوت، حساب خودتان را بسازید. `INVITE_ONLY=1` را برای bootstrap
خاموش نکنید. سپس User ID واقعی را از Settings کپی کنید، API را متوقف و همان حساب را ادمین کنید:

```powershell
docker compose stop api
docker compose run --rm --no-deps -v "${tools}:/tools:ro" --entrypoint node api /tools/alilab-admin.mjs admin /data REAL_USER_ID --api-stopped
docker compose start api
```

از پنل ادمین می‌توانید دعوت‌های بعدی و بازیابی رمز را مدیریت کنید. داده در volume نام‌دار
`alilab_data` می‌ماند؛ `docker compose down -v` این داده را حذف می‌کند و دستور توقف معمولی نیست.
Passkey به hostname وابسته است: حساب/passkey آزمایش localhost را به‌عنوان ورود معتبر دامنهٔ
اصلی فرض نکنید. دامنهٔ staging را پیش از ثبت passkey همان محیط تثبیت کنید.

## تنظیم Runflare

فایل `deploy/alilab.env.example` تنظیم پیشنهادی پایلوت است. ابتدا hostname جدا برای staging
انتخاب و هر دو مقدار `ORIGIN` و `RP_ID` را مطابق همان hostname تنظیم کنید. `training.alilab.ir`
در مثال هدف نهایی است؛ این فایل به‌تنهایی دامنه یا سرویس ایجاد نمی‌کند.

اگر Runflare دو سرویس مستقل را پشتیبانی کند، web از ریشهٔ مخزن با `web/Dockerfile` و API از
پوشهٔ `api/` با target `default` ساخته شود. API فقط شبکهٔ خصوصی داشته باشد و web پورت عمومی
داخلی nginx را ارائه کند. مقدار `BACKEND` باید نام داخلیِ واقعاً قابل resolve سرویس API باشد.

`RESOLVER=127.0.0.11` فقط برای Docker Compose مناسب است؛ روی runtime دیگر DNS واقعی platform
باید تنظیم شود. `PORT` در API و proxy برابر باشد. `TRUST_PROXY=1` فقط وقتی API از proxy
معتمدِ بازنویسندهٔ هدرها قابل دسترس است. یک volume پایدار به `/data` متصل و تعداد replicaهای
API روی **۱** ثابت شود. cache provider یا دادهٔ کاربر در image ساخته نشود.

قبل از استقرار باید از خود حساب Runflare این موارد روشن شوند: volume پایدار، باقی‌ماندن آن
بعد redeploy، private DNS و شبکه بین دو سرویس، پورت، HTTPS و امکان اجرای job آفلاین backup.
اگر پلن فقط یک container می‌دهد، این compose آمادهٔ همان مدل نیست؛ بسته‌بندی واحد نیاز به
تغییر مستقل دارد. روش استقرار AliLab اصلی یا پایگاه Supabase در این مرحله دست‌کاری نشده است.

`DEFAULT_LANG=en` فعلاً صحیح است؛ فارسی هنوز اضافه نشده. `APP_BUILD` در انتشار واقعی برابر
شناسهٔ commit/release همان build باشد. مقدار `phase1a-dev` برای توسعه است. تصویر ساخته‌شده را
با tag/commit یا digest ثابت منتشر کنید؛ از image upstream با tag `latest` استفاده نکنید.

## پشتیبان‌گیری و بازیابی

API دادهٔ JSON را در حافظه هم نگه می‌دارد؛ ایجاد دعوت، تعیین ادمین، snapshot و restore باید
زمانی انجام شود که writer متوقف است. `--api-stopped` یادآوری این قرارداد است و خودش process
را پیدا یا متوقف نمی‌کند. wrapper اجراکننده باید توقف را تضمین کند.

نمونهٔ snapshot محلی، با تضمین تلاش برای روشن‌کردن دوبارهٔ API در PowerShell:

```powershell
New-Item -ItemType Directory -Force snapshots | Out-Null
$snapshots = (Resolve-Path .\snapshots).Path
$tools = (Resolve-Path .\scripts).Path
docker compose stop api
try {
  docker compose run --rm --no-deps -v "${tools}:/tools:ro" -v "${snapshots}:/snapshots" --entrypoint node api /tools/alilab-snapshot.mjs create /data /snapshots/checkpoint-01 --api-stopped
  if ($LASTEXITCODE -ne 0) { throw "Snapshot failed" }
} finally {
  docker compose start api
}
```

پوشهٔ snapshot شامل `data/` و manifest SHA-256 است. دادهٔ حساب، secret امضای session، VAPID،
state و uploadهای موجود حفظ می‌شوند؛ snapshot قدیمی overwrite نمی‌شود. روی Linux فایل‌ها
با مجوز محدود ایجاد می‌شوند؛ ACL میزبان Windows را هم برای دسترسی خصوصی تنظیم کنید.

این snapshot **رمزگذاری‌شده نیست**. قبل از ارسال به خارج محیط، با ابزار استانداردی مانند
`age` آن را رمزگذاری کنید؛ کلید خصوصی را جدا از backup نگه دارید. مثال Linux، پس از نصب age
و تعیین کلید عمومی واقعی:

```bash
tar -czf - -C snapshots checkpoint-01 | age -r 'YOUR_REAL_AGE_PUBLIC_KEY' -o checkpoint-01.tar.gz.age
```

رمزگذاری age در محیط بررسی فعلی اجرا نشده است. checksum برای تشخیص خرابی است و جای
رمزگذاری یا تأیید منشأ backup را نمی‌گیرد.

بازیابی فقط در پوشه/volume خالی انجام شود. مسیر نمونهٔ filesystem:

```bash
node scripts/alilab-snapshot.mjs restore /path/to/checkpoint-01 /path/to/empty-restored-data --api-stopped
```

ابتدا checksum و فهرست کامل فایل‌ها بررسی می‌شود؛ دادهٔ خراب، فایل اضافی، symlink و مقصد
غیرخالی رد می‌شوند. در staging جدا، API را با `DATA_DIR` بازیابی‌شده اجرا کنید و ورود، تاریخچه
و برنامه را بررسی کنید. روی production موجود restore نکنید تا تمرین‌های جدید از بین نروند.

## سورس و مجوز

`LICENSE` و `NOTICE.md` و انتساب metadata حفظ شده‌اند. یادداشت AliLab مشخص می‌کند که توضیح
دانلود/CDN در متن اصلی NOTICE مربوط به upstream است. هیچ مجوزی برای تصویر و کلیپ نامشخص
ادعا نمی‌شود. لینک Settings به سورس خودِ build اشاره می‌کند و انتساب upstream جداست.

Docker وب سورس را همراه فایل‌های build، API، lockfileها، NOTICE و مجوز بسته‌بندی می‌کند؛
`deployment-source.json` شناسه‌های build را ثبت می‌کند. `/corresponding-source.tar.gz` باید
بعد deploy واقعاً قابل دانلود باشد. `npm run build` مستقل فقط فرانت‌اند می‌سازد و این archive
را ایجاد نمی‌کند؛ برای تحویل release از Docker وب استفاده کنید. `.dockerignore` داده، env
محلی، credentials و خروجی build را از context سورس حذف می‌کند. CI خروجی archive را بررسی می‌کند.

اسکن فعلی npm فقط dependencyهای زمان اجرای مشخص‌شده را پوشش می‌دهد. scan image/OS، dependencyهای
build، native APK و MCP جدا هستند. MCP و native release در پایلوت اجرا یا منتشر نمی‌شوند.

## معیار پایان استقرار آزمایشی

بعد از ایجاد فورک و اجرای CI: هر دو container boot شوند، صفحه و API از یک origin HTTPS
پاسخ دهند، سورس همان build دانلود شود، مسیرهای رسانهٔ قدیمی 404 بدهند و در مرورگر هیچ درخواست
رسانهٔ upstream ثبت نشود. یک تمرین ثبت/همگام شود، redeploy آن را حفظ کند و backup/restore روی
volume مستقل تست شود. تا انجام این بررسی‌ها، این بسته را «آمادهٔ بررسی و staging» بدانید،
نه «استقرار تأییدشده». سپس PR فارسی‌سازی و هویت AliLab در فاز ۱B آغاز می‌شود.
