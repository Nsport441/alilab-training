import { getLang } from '../lib/i18n-core.js'
const copy = {
  'Training overview — 28 days':'مرور تمرین در ۲۸ روز',
  'Previous 28 days':'۲۸ روز پیش از آن',
  'Completed sessions':'جلسه‌های تکمیل‌شده',
  'Training days':'روزهای تمرین',
  'Work sets':'ست‌های کاری',
  'Recorded minutes':'دقایق ثبت‌شده',
  'Recorded load × reps':'حاصل وزنهٔ ثبت‌شده × تکرار',
  'reps':'تکرار',
  'Not enough comparable data':'دادهٔ قابل مقایسه کافی نیست',
  'Observed records only; this does not estimate recovery or prescribe training.':'فقط خلاصهٔ داده‌های ثبت‌شده است؛ ریکاوری را برآورد نمی‌کند و برنامهٔ تمرین نمی‌دهد.',
  'Warm-ups and unfinished work are excluded. Bodyweight is not added to recorded load.':'گرم‌کردن و کار ناتمام محاسبه نمی‌شوند. وزن بدن به وزنهٔ ثبت‌شده اضافه نمی‌شود.',
  'Images':'تصاویر',
  'Next image':'تصویر بعدی',
  'Previous image':'تصویر قبلی',
  'Image source':'منبع تصویر',
  'Short AliLab guide':'راهنمای کوتاه AliLab',
  'Full English instructions':'راهنمای کامل انگلیسی',
}
export const alilabText = key => getLang() === 'fa' ? copy[key] || key : key
