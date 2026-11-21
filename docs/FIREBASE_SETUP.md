# إعداد Firebase المجاني وأول حساب مدير

**لا تنفّذ شيئاً من هذه الخطوات الآن.** هذا الملف شرح فقط. لم يُنشأ أي مشروع Firebase، ولم تُنشر القواعد، ولم يُضف أي سر. تُنفَّذ الخطوات بعد موافقتك الصريحة، وبعد اختيار الاستضافة (انظر `docs/DECISIONS.md`).

الهدف: تكلفة صفر. الخطة المجانية **Spark** فقط. لا تضغط أبداً على أي زر فيه Upgrade أو Blaze أو Billing، ولا تُدخل بطاقة.

## 1. إنشاء المشروع (من متصفح الهاتف)

1. افتح console.firebase.google.com وسجّل الدخول بحساب Google الخاص بك.
2. اختر Add project، واكتب اسماً (مثلاً nuvora-ai).
3. عطّل Google Analytics. لا نحتاجه.
4. اضغط Create. تأكد أن الخطة الظاهرة هي Spark (No-cost).

## 2. تطبيق الويب

1. من الصفحة الرئيسية للمشروع اختر أيقونة الويب `</>` وسمّه NUVORA.
2. لا تفعّل Firebase Hosting.
3. انسخ القيم الأربع: apiKey وauthDomain وprojectId وappId. هذه ليست أسراراً، وتوضع في إعدادات الاستضافة بأسماء `NEXT_PUBLIC_FIREBASE_API_KEY` و`NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` و`NEXT_PUBLIC_FIREBASE_PROJECT_ID` و`NEXT_PUBLIC_FIREBASE_APP_ID`.

## 3. تسجيل الدخول (Authentication)

1. Build ثم Authentication ثم Get started.
2. فعّل **Email/Password** فقط. لا تفعّل الهاتف (SMS ليست مجانية).
3. في Settings ثم Authorized domains أضف نطاق الموقع عندما يُعتمد.

## 4. قاعدة البيانات (Firestore)

1. Build ثم Firestore Database ثم Create database.
2. اختر **Production mode** (مغلقة افتراضياً).
3. اختر موقعاً إقليمياً قريباً من موريتانيا (مثلاً في أوروبا). **الموقع لا يمكن تغييره لاحقاً.**
4. بعد الإنشاء افتح تبويب Rules، والصق محتوى الملف `firestore.rules` من المستودع (فرع `phase-1-skeleton`)، ثم Publish.
5. لا تُنشئ Storage ولا Functions.

## 5. أول حساب مدير (الطريقة الأكثر أماناً)

لا يوجد في التطبيق أي طريقة تجعل شخصاً مديراً: لا زر ولا رابط ولا كلمة سر ثابتة. الصلاحية مكتوبة في الحقل `role` داخل ملف الشخص في Firestore، وقواعد الأمان تمنع أي مستخدم من تغييره، فلا يغيّره إلا من يملك مشروع Firebase (أنت) من لوحة Firebase.

1. سجّل حساباً عادياً في التطبيق بالبريد الذي ستستخدمه كمدير.
2. في لوحة Firebase افتح Authentication ثم Users وانسخ قيمة **User UID** لحسابك.
3. افتح Firestore Database ثم المجموعة `users` ثم المستند الذي اسمه هذا الـ UID.
4. عدّل الحقل `role` من `user` إلى `admin` واحفظ.
5. افتح الصفحة `/ar/admin/payments`. إن ظهرت لك قائمة الطلبات فقد نجح الأمر.

احمِ هذا الحساب: كلمة سر قوية وفريدة، والتحقق بخطوتين في حساب Google الذي يملك المشروع. إن أردت إيقاف مدير لاحقاً غيّر `accountStatus` إلى `suspended`.

## 6. مفتاح الخدمة (يحتاج موافقتك وموقع الاستضافة)

الموافقة على الدفع تعمل في كود خادم يحتاج مفتاح خدمة (Service Account). **هذا السر الأخطر في المشروع.**

1. Project settings ثم Service accounts ثم Generate new private key. سينزل ملف JSON.
2. الصق محتواه كاملاً في سطر واحد كقيمة للمتغير `FIREBASE_SERVICE_ACCOUNT_JSON` في إعدادات الاستضافة (Environment variables) فقط.
3. احذف الملف من هاتفك بعد ذلك. لا ترسله لأحد ولا تضعه في GitHub ولا في المحادثة.
4. إن تسرّب أنشئ مفتاحاً جديداً واحذف القديم فوراً من نفس الصفحة.

## ما لا نفعله

- لا Blaze ولا Billing ولا بطاقة.
- لا Cloud Storage ولا Cloud Functions ولا App Hosting (كلها تتطلب Blaze).
- لا صور إيصالات.
