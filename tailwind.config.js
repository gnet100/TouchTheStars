// הגדרות Tailwind 3.4.19. אלה ההגדרות שהיו קודם בתוך index.html בשביל ה-CDN, בלי שינוי.
// אחרי הוספת מחלקה חדשה בונים מחדש את css/app.css, עם הקובץ העצמאי של Tailwind 3.4.19 (יושב מחוץ למאגר):
//   tailwindcss-windows-x64.exe -c tailwind.config.js -i css/tailwind.css -o css/app.css --minify
module.exports = {
  // js/i18n.js הוא מילון טקסטים בלבד, בלי שמות מחלקות. מילים רגילות בו (table, block, hidden) היו נבנות בטעות כמחלקות
  content: ['./index.html', './js/**/*.js', '!./js/i18n.js'],
  // text-[${size}px] נבנית בזמן ריצה (renderDemoBoard), ולכן הסריקה לא מוצאת אותה
  safelist: ['text-[20px]'],
  darkMode: "class",
  // אפקט ריחוף רק במכשירים עם עכבר. באייפון הוא "נתקע" על כפתור אחרי נגיעה
  future: { hoverOnlyWhenSupported: true },
  theme: {
    extend: {
      colors: {
        "surface-variant": "#313540", "background": "#0f131d",
        "tertiary": "#7bd0ff", "surface-container": "#1c1f2a",
        "primary-container": "#06b6d4", "surface-container-low": "#171b26",
        "secondary-container": "#b50036", "on-surface-variant": "#bcc9cd",
        "surface-container-highest": "#313540", "on-primary": "#003640", "outline": "#869397",
        "surface-bright": "#353944", "secondary": "#ffb2b7", "primary": "#4cd7f6",
        "on-surface": "#dfe2f1", "surface-container-high": "#262a35", "surface": "#0f131d",
        "error": "#ffb4ab",
        "player1": "#60a5fa"
      },
      borderRadius: { "full": "9999px" },
      spacing: { "margin-mobile": "1rem", "space-md": "1rem", "space-sm": "0.5rem", "space-xs": "0.25rem" },
      fontFamily: { "headline-md": ["Rubik"], "headline-xl-mobile": ["Rubik"], "body-sm": ["Rubik"], "label-lg": ["Rubik"], "label-sm": ["Rubik"], "headline-xl": ["Rubik"], "body-md": ["Rubik"], "label-md": ["Rubik"], "headline-lg": ["Rubik"] }
    }
  }
}
