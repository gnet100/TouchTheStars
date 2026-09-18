package io.github.gnet100.thinkingstars;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // המשחק מעוצב לגודל טקסט קבוע, כמו באתר בכרום. בלי זה רכיב התצוגה מגדיל את הטקסט
        // לפי גודל הגופן של הטלפון, ומסך הפתיחה כבר לא נכנס בלי גלילה (נמצא בבדיקה בטלפון, 18.9.2026).
        // הגשר נוצר בתוך super.onCreate, ולכן כאן הוא כבר קיים
        getBridge().getWebView().getSettings().setTextZoom(100);
    }
}
