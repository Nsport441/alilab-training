// AliLab-authored short cues for selected variants. Full English steps are preserved.
import fs from 'node:fs'
import { EXDB } from '../frontend/src/lib/exercises-data.js'
import names from '../frontend/src/exercise-names/fa.js'
const families = [
  [/\b(?:bench press|chest press)\b/, [
    'روی نیمکت یا تکیه‌گاه مناسب این نوع حرکت قرار بگیرید؛ کف پاها را محکم نگه دارید و دسته یا وزنه را با کنترل بگیرید.',
    'با ثبات تنه، وزنه را در مسیر پرس سینه بالا یا جلو ببرید؛ آرنج‌ها را با ضربه قفل نکنید.',
    'وزنه را آرام برگردانید؛ دامنه‌ای را انتخاب کنید که بتوانید بدون تغییر ناگهانی وضعیت شانه کنترل کنید.'
  ]],
  [/\b(?:shoulder press|military press|overhead press)\b/, [
    'متناسب با نوع نشسته یا ایستادهٔ حرکت، تکیه‌گاه و تعادل بدن را تنظیم کنید و وزنه را در سطح شانه نگه دارید.',
    'با ثبات شکم و تنه، وزنه را بالای سر ببرید؛ برای جبران وزنه به کمر قوس اضافه ندهید.',
    'وزنه را با کنترل به وضعیت شروع برگردانید؛ دامنه و وزن باید با کنترل شانه هماهنگ باشند.'
  ]],
  [/\b(?:biceps? curl|hammer curl|preacher curl|concentration curl)\b/, [
    'وضعیت بدن و نوع گرفتن را مطابق نام حرکت تنظیم کنید؛ در نوع لاری، بازو روی تکیه‌گاه قرار می‌گیرد.',
    'با خم کردن آرنج وزنه را بالا بیاورید؛ از تاب دادن تنه و جلو انداختن شانه برای کمک خودداری کنید.',
    'وزنه را آرام پایین ببرید و انتهای دامنه را کنترل کنید؛ نوع تک‌دست را برای هر سمت اجرا کنید.'
  ]],
  [/\b(?:bent over row|seated row|one arm row)\b/, [
    'وضعیت نشسته، خم یا تکیه‌دار را مطابق نوع حرکت تنظیم کنید و تنه را در وضعیت پایدار نگه دارید.',
    'با عقب بردن آرنج، وزنه یا دسته را به سمت تنه بکشید؛ حرکت را با ضربهٔ کمر شروع نکنید.',
    'دسته را آرام جلو ببرید و شانه را در دامنهٔ قابل کنترل حرکت دهید؛ در نوع تک‌دست، هر سمت جدا اجرا می‌شود.'
  ]],
  [/\b(?:lateral raise|front raise)\b/, [
    'در وضعیت ذکرشدهٔ حرکت قرار بگیرید و وزنه یا دسته را با آرنج کمی خم نگه دارید.',
    'برای نشر جانب دست را به طرفین و برای نشر جلو به جلوی بدن بالا ببرید؛ تنه را تاب ندهید.',
    'از دامنهٔ کنترل‌شده استفاده کنید و وزنه را آرام پایین ببرید؛ شانه‌ها را به سمت گوش بالا نکشید.'
  ]],
  [/\b(?:triceps extension|triceps pushdown|triceps kickback)\b/, [
    'وضعیت بدن و محل بازو را مطابق نوع حرکت تنظیم کنید؛ بازو را در موقعیت پایدار نگه دارید.',
    'با باز کردن آرنج، حرکت پشت بازو را انجام دهید؛ از جابه‌جایی زیاد شانه و تاب دادن بدن کمک نگیرید.',
    'آرنج را آرام خم کنید و به شروع برگردید؛ در نوع بالای سر، قوس کمر را زیاد نکنید.'
  ]],
  [/\bleg curl\b/, [
    'در وضعیت نشسته، خوابیده یا ایستادهٔ همین حرکت قرار بگیرید؛ در دستگاه، محور مفصل و پد را تنظیم کنید.',
    'با خم کردن زانو، پاشنه را به سمت پشت ران بیاورید و لگن را در وضعیت پایدار نگه دارید.',
    'زانو را با کنترل باز کنید؛ وزنه را رها نکنید و دامنهٔ دستگاه را متناسب با کنترل خود تنظیم کنید.'
  ]],
  [/\bcalf raise\b/, [
    'مطابق نوع نشسته یا ایستادهٔ حرکت، پنجه‌ها را روی سطح ثابت بگذارید و تعادل را حفظ کنید.',
    'پاشنه را بالا بیاورید و روی پنجه‌ها قرار بگیرید؛ حرکت از مچ پا انجام می‌شود.',
    'پاشنه را آرام پایین ببرید؛ از پرش و ضربه در انتهای دامنه خودداری کنید.'
  ]],
  [/\b(?:fly|flyes)\b/, [
    'وضعیت نیمکت یا دستگاه را مطابق نوع فلای تنظیم کنید و آرنج‌ها را کمی خم نگه دارید.',
    'برای فلای سینه، دست‌ها را در مسیر قوسی جمع کنید؛ در فلای معکوس، دست‌ها به طرفین باز می‌شوند.',
    'آرام به شروع برگردید؛ دامنه را با کنترل شانه تنظیم کنید و برای افزایش دامنه وزنه را رها نکنید.'
  ]],
]
const excluded=/stretch|jump|clean|snatch|jerk|thruster|burpee|twist|cuban|arnold|bradford|guillotine|behind neck|behind the neck|rotation|rotational|press to|balance|bosu|exercise ball|stability ball|alternate|alternating|cross|windmill|v sit/
const candidates=EXDB.filter(ex=>!excluded.test(ex.n)&&families.some(([re])=>re.test(ex.n)))
const selected=candidates.sort((a,b)=>Number(a.id)-Number(b.id)).slice(0,280)
if(selected.length!==280)throw new Error(`Expected 280 selected guides, got ${selected.length}`)
const guides=Object.fromEntries(selected.map(ex=>[ex.id,[`راهنمای کوتاه «${names[ex.id]}»:`,...families.find(([re])=>re.test(ex.n))[1]]]))
fs.writeFileSync(new URL('../frontend/src/instr/fa.js',import.meta.url),'// AliLab-authored short guides. Full upstream English instructions remain available.\nexport default '+JSON.stringify(guides)+'\n')
console.log(`${selected.length} short Persian guides`)
