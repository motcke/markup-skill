/* markup — page behaviour: TOC, diagrams, charts, sortable tables, tabs,
   right-click comments, comments panel, floating comments, versions, change tags, polling. */
(() => {
  const P = window.PLAN || {};
  const isRtl = document.documentElement.dir === 'rtl';
  // H#59: dark theme = system preference unless html[data-theme] (top-bar toggle, localStorage) says otherwise
  const isDark = () => document.documentElement.dataset.theme === 'dark' || (document.documentElement.dataset.theme !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const DARK = isDark();
  { const l = document.getElementById('hljsTheme'); if (l && DARK) l.href = '/vendor/highlight-github-dark.min.css'; }
  const HE = {
    comments: 'הערות', addComment: 'הוסף הערה / שאלה', ctxNative: 'Shift + קליק ימני: תפריט הדפדפן', newComment: 'הערה חדשה', send: 'שלח', cancel: 'ביטול', reply: 'תגובה', close: 'סגור',
    reopen: 'פתח מחדש', del: 'מחק', jump: 'קפוץ למקום', active: 'פעילות', open: 'ממתין לסוכן', waiting: 'ממתין לי',
    closed: 'סגורות', all: 'הכל', you: 'אני', agent: 'הסוכן', current: 'נוכחית', readonly: 'גרסה ישנה — לקריאה בלבד',
    serverDown: 'השרת לא רץ — הפעל /markup open בסשן כדי להרים אותו', changed: 'מה השתנה בגרסה הזו', seen: 'ראיתי',
    updated: 'עודכן', added: 'חדש', removed: 'הוסר', anchoredTo: 'עבר אל', origin: 'היה על', orphan: 'המקום המקורי נמחק מהדף, ההערה מוצגת כאן',
    noThreads: 'אין הערות עדיין. סמן טקסט או לחץ קליק ימני על כל דבר בדף כדי להוסיף הערה או שאלה.', hint: 'כדי שהסוכן יענה, הקלד בסשן: /markup comments',
    kCell: 'תא', kRow: 'שורה', kTable: 'טבלה', kItem: 'פריט', kPara: 'פסקה', kHeading: 'כותרת', kCode: 'קטע קוד', kFigure: 'איור', kQuote: 'ציטוט', kDetails: 'פרטים', kSection: 'מקטע', kKpi: 'מדד', kCard: 'כרטיס', kCallout: 'הדגשה', kDiagram: 'תרשים', kChart: 'גרף', kBlock: 'בלוק',
    commentBtn: 'הערה', tipText: 'סמן טקסט או לחץ קליק ימני על כל דבר בדף כדי להעיר. עם טקסט מסומן אפשר גם ללחוץ C.', tipTouch: 'סמן טקסט כדי להעיר עליו.', tipClose: 'הבנתי',
    backCurrent: 'לגרסה הנוכחית', countTitle: (w, o) => `${w} ממתינות לך · ${o} ממתינות לסוכן`,
    astCopyCmd: 'העתק פקודה לסוכן', wakeSaved: 'נשמר. הדבק את הפקודה בסשן של הסוכן', nudgeGoCopy: 'לא, העתק את הפקודה',
    confirmDel: 'למחוק את ההערה לצמיתות?', top: 'ראש הדף', writeHere: 'כתוב הערה או שאלה…', writeReply: 'תגובה…', on: 'על',
    statusOpen: 'ממתין לסוכן', statusWaiting: 'ממתין לי', statusClosed: 'סגור', level: 'הורה',
    edit: 'ערוך', edited: 'נערך', save: 'שמור', statusTitle: 'שינוי סטטוס ההערה',
    collapse: 'קיפול', expand: 'פתיחה', untitled: 'ללא כותרת',
    attach: 'צרף קובץ (או הדבק תמונה מהלוח)', tooBig: 'הקובץ גדול מ-8MB ולא צורף', remove: 'הסר',
    maximize: 'הגדל ל-80% מאזור התוכן', restore: 'חזרה לגודל הקודם',
    draftPending: 'הערה שלא נשלחה', draftOpen: 'פתח', draftDrop: 'מחק', answered: 'נשמר',
    wake: 'סיימתי, תעיר את הסוכן', wakeTitle: 'מסמן שסיימת להעיר ולענות; סוכן שמאזין לדף מתעורר וקורא הכל', woke: 'נשלח, הסוכן יתעורר', wakeFailed: 'השרת לא רץ',
    wakeListening: 'סוכן מאזין לדף: לחיצה על הכפתור תעיר אותו', wakeNobody: 'אין סוכן מאזין לדף. הכפתור לא יעיר אף אחד; כתוב בצ\'אט', wakeNobodyLong: 'נשלח, אבל אין סוכן מאזין. כתוב בצ\'אט',
    wakeSent: 'נשלח לסוכן', wakeLate: 'הסוכן לא הגיב. כתוב בצ\'אט', astStuck: 'אין סימן חיים מהסוכן מאז', astStuckTitle: 'הקריאה נמסרה אבל הסוכן לא כתב כלום מאז. כנראה נעצר (ניתוק, שגיאה, אישור שממתין); בדוק את הטרמינל או שלח שוב', astResend: 'שלח שוב', wakePicked: 'הסוכן קיבל', wakeWorking: 'הסוכן עובד על ההערות', wakeDone: 'הסוכן סיים ב-', wakeCancel: 'בטל את הקריאה',
    wakeChipTitle: 'מצב הקריאה לסוכן: נשלח ← התקבל ← עובד ← סיים. הטיימר סופר מאז השלב האחרון',
    foldTitle: 'קפל: הכרטיסים ליד הטקסט והפאנל כפס צר. פתיחה מחזירה למצב הקודם', modeFloat: 'מעוגן', modePanel: 'פאנל', modeFloatTitle: 'כל הערה ככרטיס ליד המקום שסומן; הרשימה בפאנל צד קבוע', modePanelTitle: 'כל ההערות בפאנל אחד, ניתן לגרירה ולשינוי גודל',
    minimize: 'הסתר — יופיע רק ברשימה בצד', hidden: 'מוסתרת', miniHint: 'לחיצה על כותרת קופצת להערה הצפה ומציגה אותה. גרירה בכותרת מזיזה, הפינה התחתונה משנה גודל, לחיצה כפולה על הכותרת מחזירה מקום וגודל.',
    showAll: 'הצג הכל', hideAll: 'הסתר הכל', noneHere: 'אין הערות', shown: 'מוצגות',
    drafts: 'טיוטות', noDrafts: 'אין טיוטות', draftNew: 'הערה חדשה',
    secShown: 'ברירת המחדל של המדור: מוצג. הערה חדשה, או שעברה לסטטוס הזה, תצוף. לחיצה: מוסתר', secHidden: 'ברירת המחדל של המדור: מוסתר. הערה חדשה, או שעברה לסטטוס הזה, תישאר ברשימה בלבד. לחיצה: מוצג',
    astNone: 'אין סוכן מאזין', astNoneShort: 'אין סוכן', astListenShort: 'מאזין', astSeen: 'נראה לאחרונה', astSince: 'מאזין מאז', astBusy: 'הסוכן פעיל', astQueue: 'שלח לתור הסוכן', astBusyTitle: 'הסוכן באמצע תור; לחיצה נכנסת לתור ותימסר לו בסיום התור', astWake: 'הער את הסוכן',
    astWakeTitle: 'מסמן שסיימת להעיר ולענות; הסוכן שמאזין לדף מתעורר וקורא הכל', astNoneTitle: 'אף סוכן לא מאזין לדף הזה. הכפתור שומר את הקריאה ומעתיק פקודה; הדבק אותה בסשן של הסוכן',
    themeDark: 'מצב כהה', themeLight: 'מצב בהיר', astCopy: 'העתק פקודה', astCopied: 'הועתק, הדבק לסוכן', astNotif: 'הדף מחכה לסוכן', ctxVersion: 'גרסה', ctxSinceLast: 'מאז הגרסה האחרונה', ctxReset: 'ההקשר קטן (compaction)', ctxGrowth: 'גדל', ctxLeft: 'נשאר', ctxTotal: 'בשימוש',
    nudgeTitle: 'שכחת לשלוח לסוכן?', nudgeOne: 'השארת הערה אחת ועוד לא שלחת אותה לסוכן.', nudgeMany: 'הערות ועוד לא שלחת אותן לסוכן.', nudgeLeft: 'השארת',
    nudgeWhy: 'עד שתשלח, הסוכן לא יודע שיש לו עבודה.', nudgeAsk: 'יש לך עוד משהו לכתוב?', nudgeGo: 'לא, תעיר את הסוכן', nudgeLater: 'כן, אני עוד כותב',
    astUnanswered: 'שאלות לא נענו', astSendAnyway: 'שלח בכל זאת', astKeep: 'המשך לענות', cancel: 'בטל',
    qCount: 'שאלות', qNext: 'הבא', qPrev: 'הקודם', qNextTitle: 'לשאלה הבאה שלא נענתה (Enter)', qOf: 'מתוך', qKeys: 'מספר בוחר אפשרות, Enter לשאלה הבאה',
    qCat: 'שאלות לגבי', qDone: 'נענו',
    ctxTitle: 'ההקשר של הסוכן שמשרת את הדף (לפי התמליל האחרון של הפרויקט)', ctxOf: 'הקשר', ctxNone: 'אין נתוני הקשר', ctxUpdated: 'עודכן',
    sendFailed: 'השליחה נכשלה. הטקסט נשאר בתיבה', copy: 'העתק', copied: 'הועתק', filter: 'סינון שורות…', low: 'נמוך', high: 'גבוה', legendBad: 'רע', legendMid: 'בינוני', legendGood: 'טוב', below: 'מתחת', above: 'מעל',
    updChip: 'עדכון', updTitle: 'גרסה חדשה של markup:', updInstalled: 'מותקנת אצלך', updNotes: 'מה חדש', updNow: 'שדרג', updAgent: 'שדרג עם הסוכן', updCopy: 'העתק פקודה', updLater: 'לא עכשיו',
    updModified: 'שינית קבצים של הסקיל. הסוכן יבדוק מה הוספת, ימזג עם הגרסה החדשה ויציג דוח לאישור לפני שהוא כותב משהו. קבצים ששונו:',
    updDev: 'זה checkout של git, אז השדרוג הוא git pull:', updRunning: 'משדרג…', updRestart: 'שודרג. השרת עולה מחדש…', updReload: 'שודרג. רענן את הדף.',
    updFailed: 'השדרוג נכשל:', updSent: 'נשלח לסוכן. המצב שלו מופיע בסרגל העליון.', updNobody: 'אין סוכן מאזין. הפקודה הועתקה, הדבק אותה בסשן:', updCopied: 'הועתק',
    reportToc: 'דיווח על תקלה או רעיון ל-markup', reportTitle: 'דיווח ל-markup', reportDraft: 'דיווח חדש',
    reportHere: 'מה קרה ומה ציפית שיקרה, או מה היית רוצה שיתווסף…', reportType: 'סוג הדיווח',
    reportNote: 'הסוכן ינסח מזה issue ב-GitHub, יציג לך כאן טיוטה ויפתח אותו רק אחרי שתאשר. אחרי השליחה העבר אותו לסוכן בכפתור שבסרגל העליון.',
    reportGh: 'פתח ישירות ב-GitHub', reportGhTitle: 'פותח את טופס ה-issue ב-GitHub עם מה שכתבת, בלי הסוכן', reportGeneral: 'דיווח כללי ל-markup, לא על מקום מסוים בדף',
    reportKind: 'דיווח ל-markup (GitHub issue)', reportFiled: 'נפתח ב-GitHub', t_bug: 'באג', t_feature: 'שדרוג', t_question: 'שאלה', t_other: 'אחר',
    help: 'עזרה', helpTitle: 'איך עובדים עם הדף',
    helpRows: [
      ['הערה', 'סמן טקסט ולחץ "הערה", קליק ימני על כל דבר, או C'],
      ['שליחה', 'Ctrl+Enter שולח הערה או תשובה'],
      ['שאלות', 'ספרה בוחרת אפשרות, Enter עובר לשאלה הבאה'],
      ['הסוכן', 'הערות ובחירות נשמרות מיד. הסוכן קורא אותן כשלוחצים על הכפתור בסרגל העליון'],
      ['תפריט הדפדפן', 'Shift + קליק ימני'],
    ],
    aVersions: 'גרסאות', aToc: 'תוכן עניינים', aFloats: 'הערות',
  };
  const EN = {
    comments: 'Comments', addComment: 'Add comment / question', ctxNative: 'Shift + right-click: browser menu', newComment: 'New comment', send: 'Send', cancel: 'Cancel', reply: 'Reply', close: 'Close',
    reopen: 'Reopen', del: 'Delete', jump: 'Jump to', active: 'Active', open: 'Waiting for agent', waiting: 'Waiting for me',
    closed: 'Closed', all: 'All', you: 'Me', agent: 'Agent', current: 'current', readonly: 'Older version — read only',
    serverDown: 'Server is down — run /markup open in the session to start it', changed: 'What changed in this version', seen: 'Got it',
    updated: 'updated', added: 'new', removed: 'removed', anchoredTo: 'Moved to', origin: 'Was on', orphan: 'Its original place was removed from the page, so it is shown here',
    noThreads: 'No comments yet. Select text or right-click anything on the page to add a comment or question.', hint: 'To get answers, type in the session: /markup comments',
    kCell: 'cell', kRow: 'row', kTable: 'table', kItem: 'item', kPara: 'paragraph', kHeading: 'heading', kCode: 'code block', kFigure: 'figure', kQuote: 'quote', kDetails: 'details', kSection: 'section', kKpi: 'KPI', kCard: 'card', kCallout: 'note', kDiagram: 'diagram', kChart: 'chart', kBlock: 'block',
    commentBtn: 'Comment', tipText: 'Select text or right-click anything on the page to comment. With text selected, C works too.', tipTouch: 'Select text to comment on it.', tipClose: 'Got it',
    backCurrent: 'Go to the current version', countTitle: (w, o) => `${w} waiting for you · ${o} waiting for the agent`,
    astCopyCmd: 'Copy command for the agent', wakeSaved: 'Saved. Paste the command into the agent\'s session', nudgeGoCopy: 'No, copy the command',
    confirmDel: 'Delete this comment permanently?', top: 'Top of page', writeHere: 'Write a comment or question…', writeReply: 'Reply…', on: 'on',
    statusOpen: 'Waiting for agent', statusWaiting: 'Waiting for me', statusClosed: 'Closed', level: 'parent',
    edit: 'Edit', edited: 'edited', save: 'Save', statusTitle: 'Change thread status',
    collapse: 'Collapse', expand: 'Expand', untitled: 'Untitled',
    attach: 'Attach a file (or paste an image from the clipboard)', tooBig: 'File larger than 8MB — not attached', remove: 'Remove',
    maximize: 'Maximize to 80% of the content area', restore: 'Back to the previous size',
    draftPending: 'Unsent comment', draftOpen: 'Open', draftDrop: 'Discard', answered: 'saved',
    wake: 'Done, wake the agent', wakeTitle: 'Marks that you finished commenting; an agent listening to this page wakes up and reads everything', woke: 'Sent, the agent will wake', wakeFailed: 'Server is down',
    wakeListening: 'An agent is listening: the button will wake it', wakeNobody: 'No agent is listening. The button wakes nobody; write in the chat', wakeNobodyLong: 'Sent, but no agent is listening. Write in the chat',
    wakeSent: 'Sent to the agent', wakeLate: 'No answer from the agent. Write in the chat', astStuck: 'No sign of life from the agent since', astStuckTitle: 'The call was picked up but the agent has written nothing since. It probably stopped (disconnect, error, a waiting approval); check the terminal or send again', astResend: 'Send again', wakePicked: 'Agent picked it up', wakeWorking: 'Agent is working on the comments', wakeDone: 'Agent finished at ', wakeCancel: 'Cancel the call',
    wakeChipTitle: 'Where the call stands: sent → picked up → working → done. The timer counts from the last step',
    foldTitle: 'Fold: cards next to the text, the panel as a thin strip. Opening restores the previous mode', modeFloat: 'Anchored', modePanel: 'Panel', modeFloatTitle: 'Every comment as a card next to its anchor; the list in a docked side panel', modePanelTitle: 'All comments in one panel, draggable and resizable',
    minimize: 'Hide — listed in the side panel only', hidden: 'hidden', miniHint: 'Click a title to show its floating card and jump to it. Drag by the header, resize from the bottom corner, double-click the header to reset place and size.',
    showAll: 'Show all', hideAll: 'Hide all', noneHere: 'No comments', shown: 'shown',
    drafts: 'Drafts', noDrafts: 'No drafts', draftNew: 'New comment',
    secShown: 'Section default: shown. A new thread, or one arriving in this status, floats. Click: hidden', secHidden: 'Section default: hidden. A new thread, or one arriving in this status, stays in the list only. Click: shown',
    astNone: 'No agent listening', astNoneShort: 'No agent', astListenShort: 'Listening', astSeen: 'last seen', astSince: 'listening since', astBusy: 'Agent is busy', astQueue: 'Queue for the agent', astBusyTitle: 'The agent is mid-turn; a press is queued and delivered when the turn ends', astWake: 'Wake the agent',
    astWakeTitle: 'Marks that you finished commenting; the agent listening to this page wakes up and reads everything', astNoneTitle: 'No agent is listening to this page. The button saves your call and copies a command; paste it into the agent\'s session',
    nudgeTitle: 'Forgot to send it to the agent?', nudgeOne: 'You left a comment and haven\'t sent it to the agent yet.', nudgeMany: 'comments and haven\'t sent them to the agent yet.', nudgeLeft: 'You left',
    nudgeWhy: 'Until you send, the agent doesn\'t know there is work waiting.', nudgeAsk: 'Anything else to write?', nudgeGo: 'No, wake the agent', nudgeLater: 'Yes, still writing',
    astUnanswered: 'questions unanswered', astSendAnyway: 'Send anyway', astKeep: 'Keep answering', cancel: 'Cancel',
    themeDark: 'Dark mode', themeLight: 'Light mode', astCopy: 'Copy command', astCopied: 'Copied, paste it to the agent', astNotif: 'The page is waiting for the agent', ctxVersion: 'version', ctxSinceLast: 'since the last version', ctxReset: 'context shrank (compaction)', ctxGrowth: 'grew', ctxLeft: 'left', ctxTotal: 'in use',
    qCount: 'Questions', qNext: 'Next', qPrev: 'Previous', qNextTitle: 'To the next unanswered question (Enter)', qOf: 'of', qKeys: 'digit picks an option, Enter moves on',
    qCat: 'Questions about', qDone: 'answered',
    ctxTitle: 'Context of the agent serving this page (from the project\'s latest transcript)', ctxOf: 'context', ctxNone: 'no context data', ctxUpdated: 'updated',
    sendFailed: 'Sending failed. Your text is still in the box', copy: 'Copy', copied: 'Copied', filter: 'Filter rows…', low: 'low', high: 'high', legendBad: 'bad', legendMid: 'medium', legendGood: 'good', below: 'below', above: 'above',
    updChip: 'Update', updTitle: 'New markup version:', updInstalled: 'Installed', updNotes: 'What\'s new', updNow: 'Upgrade', updAgent: 'Upgrade with the agent', updCopy: 'Copy command', updLater: 'Not now',
    updModified: 'You changed files of the skill. The agent will look at what you added, merge it with the new version, and show a report for approval before it writes anything. Changed files:',
    updDev: 'This is a git checkout, so the upgrade is git pull:', updRunning: 'Upgrading…', updRestart: 'Upgraded. The server is restarting…', updReload: 'Upgraded. Reload the page.',
    updFailed: 'Upgrade failed:', updSent: 'Sent to the agent. Its status is in the top bar.', updNobody: 'No agent is listening. The command was copied, paste it into the session:', updCopied: 'Copied',
    reportToc: 'Report a bug or idea to markup', reportTitle: 'Report to markup', reportDraft: 'New report',
    reportHere: 'What happened and what you expected, or what you would like added…', reportType: 'Report type',
    reportNote: 'The agent turns this into a GitHub issue, shows you the draft here, and files it only after you approve. After sending, hand it to the agent with the button in the top bar.',
    reportGh: 'Open on GitHub directly', reportGhTitle: 'Opens the GitHub issue form with what you wrote, without the agent', reportGeneral: 'A general report to markup, not about a place on the page',
    reportKind: 'Report to markup (GitHub issue)', reportFiled: 'Filed on GitHub', t_bug: 'Bug', t_feature: 'Feature', t_question: 'Question', t_other: 'Other',
    help: 'Help', helpTitle: 'How this page works',
    helpRows: [
      ['Comment', 'Select text and press "Comment", right-click anything, or press C'],
      ['Send', 'Ctrl+Enter sends a comment or a reply'],
      ['Questions', 'A digit picks an option, Enter moves to the next question'],
      ['The agent', 'Comments and picks are saved at once. The agent reads them when you press the button in the top bar'],
      ['Browser menu', 'Shift + right-click'],
    ],
    aVersions: 'Versions', aToc: 'Table of contents', aFloats: 'Comments',
  };
  const T = P.lang === 'he' ? HE : EN; // UI strings exist in Hebrew and English; other RTL languages get the English UI in an RTL layout
  const LOCALE = P.lang === 'he' ? 'he-IL' : P.lang === 'ar' ? 'ar' : P.lang === 'fa' ? 'fa' : 'en-GB';
  // Floating-comments preference is global (one taste, every plan); positions and hidden cards are
  // per plan. Declared first: layout hooks in the content setup below already consult floatMode.
  const FLOAT_KEY = 'markup:float-mode';
  const FLOAT_POS_KEY = `markup:float-pos:${P.dir}`;
  const FLOAT_MIN_KEY = `markup:float-min:${P.dir}`;
  // floating mode is the default (26/08); the user's explicit choice is remembered globally
  // storedFloat is the user's choice; floatMode is what the page does now. Below NARROW there is no
  // room for cards beside the text, so the page runs in panel mode (a bottom sheet) without touching
  // the stored choice, and returns to it when the window grows again.
  const NARROW = 900, ANCHOR_MIN = 1060;
  const isNarrow = () => window.innerWidth < NARROW;
  const canAnchor = () => window.innerWidth >= ANCHOR_MIN;
  let storedFloat = true;
  let layoutTimer = 0; // used by scheduleLayout(); declared here because tabs/sort/filter setup calls it before the floats section runs (TDZ, 28/08)
  try { storedFloat = localStorage.getItem(FLOAT_KEY) !== '0'; } catch { /* private mode */ }
  let floatMode = storedFloat && canAnchor();
  const setStoredFloat = (on) => { storedFloat = on; floatMode = on && canAnchor(); try { localStorage.setItem(FLOAT_KEY, on ? '1' : '0'); } catch { /* private mode */ } };
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const content = $('#content');
  // Extension API (V9, 28/09): scripts in ~/.markup/ext/ load after this file and add components
  // through this one call. It runs init on every matching element of the content; the content is
  // never re-rendered, so once is enough. Small on purpose: an extension sees the language and the
  // theme, not this file's internals, so an upgrade of plan.js does not break it. Defined first, so
  // an error later in this file cannot take it away.
  window.markup = Object.freeze({
    api: 1, lang: P.lang, plan: P.dir, dark: DARK, readonly: Boolean(P.readonly),
    register({ name, selector, init } = {}) {
      if (!selector || typeof init !== 'function') { console.error(`markup.register(${name || '?'}): selector and init are required`); return 0; }
      const els = $$(selector, content);
      els.forEach((el) => { try { init(el, { lang: P.lang, dark: DARK }); } catch (e) { console.error(`markup extension ${name || selector}:`, e); } });
      return els.length;
    },
  });
  const BLOCK_SEL = 'td, th, li, p, h1, h2, h3, h4, h5, h6, pre, blockquote, figure, dt, dd, table, details, summary, .kpi, .card, .item, .callout, .mermaid, .chart, .col, section';
  // Neutral by default: no green and no red here, so a series never gets an accidental
  // "good" or "bad" color just because of its position. Meaning is opt-in via `tones`.
  const PALETTE = ['#2563eb', '#0891b2', '#7c3aed', '#64748b', '#db2777', '#0d9488', '#4f46e5', '#a16207', '#475569', '#9333ea'];
  // Semantic tones — pass "tones": ["ok","warn",…] on a dataset (one per slice/bar) or
  // "tone": "ok" for the whole dataset. Use them whenever the data means done/blocked/risk.
  const TONES = { ok: '#16a34a', warn: '#f59e0b', danger: '#dc2626', info: '#2563eb', muted: '#94a3b8', neutral: '#64748b' };
  const toneColor = (t, fallback) => TONES[t] || fallback;

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
  // innerText keeps cell/line separators (as whitespace); textContent glues table cells together.
  // Our own markers (#n badges, "updated" tags) are not part of the text: a heading must read the
  // same with and without comments on it, or anchors stop matching between versions.
  // The live element's innerText, minus our markers: a detached clone has no layout, and its
  // innerText glued table cells together ("#DecisionRationaleStatus"). Markers sit at the end of
  // their element or of a highlighted quote, so the last occurrence of each is the one dropped.
  const textOf = (el) => {
    // a rendered diagram's innerText is every label in paint order ("Yes No Yes No Webhook…"), useless
    // to the agent and to the reader: its caption names it, else the source it was written from
    if (el.classList?.contains('mermaid')) {
      const cap = el.parentElement?.tagName === 'FIGURE' ? el.parentElement.querySelector(':scope > figcaption') : null;
      const t = cap ? norm(cap.textContent) : el.dataset.mmText;
      if (t) return t.slice(0, 120);
    }
    let t = String(el.innerText ?? el.textContent ?? '');
    if (el.querySelectorAll) for (const b of el.querySelectorAll('.c-badge, .badge.upd')) { const bt = b.textContent; const i = bt ? t.lastIndexOf(bt) : -1; if (i >= 0) t = t.slice(0, i) + t.slice(i + bt.length); }
    return norm(t).slice(0, 120);
  };
  const pad = (n) => String(n).padStart(2, '0');
  const fmtIso = (iso) => { const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`; };
  const fmtVersion = (v) => { const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})$/.exec(v || ''); return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : v; };
  const api = async (p, opts = {}) => {
    const r = await fetch(`/${P.dir}/api${p}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
    if (!r.ok) throw new Error(`${r.status}`);
    return r.json();
  };
  // Reports to markup (Mode: issue in SKILL.md). Without the agent, GitHub's new-issue form opens
  // prefilled: the first line as the title, the text and the environment as the body. Browsers cap
  // URLs, so a long text is cut. Labels apply only for users with triage rights: the type is in the
  // body too.
  const ISSUE_TYPE_KEYS = ['bug', 'feature', 'question', 'other'];
  const ISSUE_LABEL = { bug: 'bug', feature: 'enhancement', question: 'question' };
  const ISSUE_NAME = { bug: 'Bug', feature: 'Feature request', question: 'Question', other: 'Other' };
  function ghIssueUrl(text, type) {
    const t = String(text || '').trim();
    const title = t.split('\n')[0].slice(0, 80);
    let body = t;
    const env = `\n\n---\n**Type:** ${ISSUE_NAME[type] || 'Other'}\n\n| Environment | |\n| --- | --- |\n| markup | ${P.markup || 'unknown'} |\n| Browser | ${navigator.userAgent} |\n`;
    const url = () => `https://github.com/${P.repo}/issues/new?${new URLSearchParams({ title, body: body + env, ...(ISSUE_LABEL[type] ? { labels: ISSUE_LABEL[type] } : {}) })}`;
    while (url().length > 7000 && body.length > 200) body = `${body.slice(0, Math.floor(body.length * 0.8))}\n\n…`;
    return url();
  }
  const readJson = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v === null || v === undefined ? d : v; } catch { return d; } };
  const writeJson = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode */ } };
  const flash = (el) => { if (!el) return; el.classList.remove('c-flash'); void el.offsetWidth; el.classList.add('c-flash'); };

  // ---------- static strings ----------
  $$('[data-t]').forEach((el) => { if (T[el.dataset.t]) el.textContent = T[el.dataset.t]; });

  // ---------- content preparation ----------
  const usedIds = new Set($$('[id]').map((e) => e.id));
  function slugId(text, i) {
    let base = norm(text).toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 50) || `s${i}`;
    let id = base; let k = 2;
    while (usedIds.has(id)) id = `${base}-${k++}`;
    usedIds.add(id);
    return id;
  }
  $$('h2, h3', content).forEach((h, i) => { if (!h.id) h.id = slugId(h.textContent, i); });
  $$('table', content).forEach((t) => {
    if (t.parentElement.classList.contains('table-wrap')) return;
    const w = document.createElement('div'); w.className = 'table-wrap'; t.replaceWith(w); w.appendChild(t);
  });

  // TOC
  const toc = $('#toc');
  const heads = $$('h2, h3', content);
  toc.innerHTML = heads.map((h) => `<a href="#${h.id}" class="${h.tagName.toLowerCase()}" data-for="${h.id}">${esc(h.textContent)}</a>`).join('')
    // reporting a problem with markup itself: at the bottom of the list, sticky (plan.css)
    + (P.readonly ? '' : `<div class="toc-foot"><button type="button" class="toc-report" data-report><span class="gh-issue" aria-hidden="true"></span> ${esc(T.reportToc)}</button></div>`);
  if (heads.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { $$('a', toc).forEach((a) => a.classList.toggle('active', a.dataset.for === en.target.id)); } });
    }, { rootMargin: '-60px 0px -70% 0px' });
    heads.forEach((h) => io.observe(h));
  }

  // mermaid
  if (window.mermaid && $('.mermaid', content)) {
    try {
      // same font stack as the page (the CSS --font, Hebrew faces included), not a second hard-coded list
      // 'base' with the page's own palette: soft slate nodes, readable lines, a pale-yellow note,
      // the same in light and dark (the stock 'neutral' theme is flat gray with a black note bar)
      const MM = DARK
        ? { darkMode: true, background: '#171c28', primaryColor: '#1e293b', primaryBorderColor: '#475569', primaryTextColor: '#e5e7eb', secondaryColor: '#1c2740', secondaryBorderColor: '#3b5a8a', tertiaryColor: '#161a23', tertiaryBorderColor: '#334155', lineColor: '#94a3b8', textColor: '#e5e7eb', mainBkg: '#1e293b', nodeBorder: '#475569', clusterBkg: '#161a23', clusterBorder: '#334155', edgeLabelBackground: '#171c28', actorBkg: '#1e293b', actorBorder: '#475569', actorTextColor: '#e5e7eb', actorLineColor: '#475569', signalColor: '#94a3b8', signalTextColor: '#e5e7eb', labelBoxBkgColor: '#1e293b', labelBoxBorderColor: '#475569', labelTextColor: '#e5e7eb', noteBkgColor: '#3a3413', noteBorderColor: '#a16207', noteTextColor: '#fef9c3', activationBkgColor: '#1c2740', activationBorderColor: '#3b5a8a' }
        : { background: '#ffffff', primaryColor: '#eef2f7', primaryBorderColor: '#94a3b8', primaryTextColor: '#1f2937', secondaryColor: '#e0f2fe', secondaryBorderColor: '#7dd3fc', tertiaryColor: '#f8fafc', tertiaryBorderColor: '#cbd5e1', lineColor: '#64748b', textColor: '#1f2937', mainBkg: '#eef2f7', nodeBorder: '#94a3b8', clusterBkg: '#f8fafc', clusterBorder: '#cbd5e1', edgeLabelBackground: '#ffffff', actorBkg: '#eef2f7', actorBorder: '#94a3b8', actorTextColor: '#1f2937', actorLineColor: '#cbd5e1', signalColor: '#475569', signalTextColor: '#1f2937', labelBoxBkgColor: '#eef2f7', labelBoxBorderColor: '#94a3b8', labelTextColor: '#1f2937', noteBkgColor: '#fef9c3', noteBorderColor: '#eab308', noteTextColor: '#1f2937', activationBkgColor: '#e0f2fe', activationBorderColor: '#7dd3fc' };
      const font = getComputedStyle(document.body).fontFamily;
      mermaid.initialize({ startOnLoad: false, theme: 'base', themeVariables: { ...MM, fontFamily: font, fontSize: '15px' }, securityLevel: 'loose', fontFamily: font, flowchart: { htmlLabels: true, curve: 'basis' } });
      // quotes after `as` print literally in sequence diagrams; pages written before the guide said so
      // still render clean names
      $$('#content .mermaid').forEach((p) => { if (/^\s*sequenceDiagram/.test(p.textContent)) p.textContent = p.textContent.replace(/^(\s*(?:participant|actor)\s+\S+\s+as\s+)"([^"\n]*)"[ \t]*$/gm, '$1$2'); });
      $$('#content .mermaid').forEach((p) => { p.dataset.mmText = norm(p.textContent || ''); }); // the source, for anchors (textOf), before any rewrite
      // classDef / style colors are written for a white page (the guide's pale fills); in dark mode the
      // theme's light label text sat on those pale fills and vanished. Same hue, dark shade; a dark
      // `color:` becomes light.
      if (DARK) {
        const hsl = (hex) => {
          let h = hex.replace('#', ''); if (h.length === 3) h = h.split('').map((c) => c + c).join('');
          const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
          const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
          const sat = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
          const hue = !d ? 0 : mx === r ? 60 * (((g - b) / d) % 6) : mx === g ? 60 * ((b - r) / d + 2) : 60 * ((r - g) / d + 4);
          return [(hue + 360) % 360, sat, l];
        };
        const css = ([h, s2, l]) => { // back to hex: mermaid splits classDef on ',' and ':', so no hsl()
          const a = s2 * Math.min(l, 1 - l);
          const f = (n) => { const k = (n + h / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)))).toString(16).padStart(2, '0'); };
          return `#${f(0)}${f(8)}${f(4)}`;
        };
        const flip = (prop, hex) => {
          const [h, s2, l] = hsl(hex);
          if (prop === 'fill' && l > 0.6) return css([h, Math.min(s2, 0.45), 0.2]);
          if (prop === 'stroke' && l < 0.45) return css([h, s2, 0.6]);
          if (prop === 'color' && l < 0.5) return css([h, Math.min(s2, 0.3), 0.88]);
          return hex;
        };
        $$('#content .mermaid').forEach((p) => {
          p.textContent = p.textContent.replace(/^(\s*(?:classDef|style)\s.*)$/gm, (line) => line.replace(/\b(fill|stroke|color)\s*:\s*(#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})\b/g, (m, prop, hex) => `${prop}:${flip(prop, hex)}`));
        });
      }
      $$('#content .mermaid').forEach((p) => { p.dataset.src = (p.textContent || '').trim().split('\n').find((l) => l.trim() && !l.trim().startsWith('%%')) || ''; }); // check --browser names a failed block by its first line
    } catch (e) { console.warn('mermaid', e); }
  }
  // Diagrams render only once they are visible: mermaid measures text, and a block inside a hidden
  // tab or a closed <details> came out as an empty 16px svg. Called after the tabs are set up and
  // again whenever a tab or a details element opens.
  function runMermaid() {
    if (!window.mermaid) return;
    const nodes = $$('.mermaid', content).filter((p) => !p.dataset.processed && !p.dataset.mmQueued && p.getClientRects().length);
    if (!nodes.length) return;
    nodes.forEach((p) => { p.dataset.mmQueued = '1'; });
    mermaid.run({ nodes }).catch((e) => console.warn('mermaid', e)).finally(() => { nodes.forEach(mermaidMinWidth); scheduleLayout(); });
  }
  // A wide diagram shrinks to its column, and at half its size the labels are unreadable. It keeps
  // at least MM_MIN of its natural width and scrolls sideways past that (review 29/09).
  // Print has no sideways scroll: a diagram that portrait A4 (182mm, 688px) would shrink below MM_MIN
  // prints on a landscape page of its own (.mm-wide, plan.css), or its labels came out at ~5pt (review 29/09).
  const MM_MIN = 0.75, PRINT_W = 688;
  function mermaidMinWidth(p) {
    const svg = $('svg', p); if (!svg) return;
    const natural = parseFloat(svg.style.maxWidth) || svg.viewBox?.baseVal?.width || 0;
    if (natural) svg.style.setProperty('--mm-min', `${Math.round(natural * MM_MIN)}px`);
    const box = p.closest('figure') || p, wide = natural * MM_MIN > PRINT_W;
    box.classList.toggle('mm-wide', wide);
    // the heading right above goes along, or it is left alone at the foot of the portrait page
    const h = box.previousElementSibling;
    if (h && /^H[2-4]$/.test(h.tagName)) h.classList.toggle('mm-wide', wide);
    watchScroll(p);
  }

  // charts (the array is declared first: the print handlers below use it, and so does the loop)
  const chartInstances = [];
  if (window.Chart) {
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.size = 13;
    Chart.defaults.color = DARK ? '#cbd5e1' : '#374151';
    // No animation: the page is screenshotted all the time (CDP verification, comment attachments)
    // and a chart caught mid-animation is blank or half drawn.
    Chart.defaults.animation = false;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 6;
    $$('canvas[data-chart]', content).forEach((c, ci) => {
      try {
        const cfg = JSON.parse(c.dataset.chart);
        const circular = ['pie', 'doughnut', 'polarArea'].includes(cfg.type);
        const sets = cfg.data?.datasets || [];
        // one series has no legend: it names what the heading and the axis already say, and colored per
        // bar by tones it showed the first bar's color as the series color (reviews 29/09)
        const oneSeries = !circular && sets.length === 1;
        sets.forEach((ds, i) => {
          const perPoint = Array.isArray(ds.tones) ? ds.tones : null;
          const base = toneColor(ds.tone, PALETTE[i % PALETTE.length]);
          if (!ds.backgroundColor) {
            if (perPoint) ds.backgroundColor = (ds.data || []).map((_, j) => toneColor(perPoint[j], PALETTE[j % PALETTE.length]));
            else if (circular) ds.backgroundColor = (ds.data || []).map((_, j) => PALETTE[j % PALETTE.length]);
            else ds.backgroundColor = cfg.type === 'line' ? `${base}22` : base;
          }
          if (!ds.borderColor && !circular) ds.borderColor = perPoint ? ds.backgroundColor : base;
          delete ds.tone; delete ds.tones;
          if (cfg.type === 'line' && ds.tension === undefined) { ds.tension = 0.3; ds.cubicInterpolationMode = 'monotone'; } // a curve, but never above or below the points it joins
          if (cfg.type === 'line') { if (ds.pointRadius === undefined) ds.pointRadius = 2.5; if (ds.pointHoverRadius === undefined) ds.pointHoverRadius = 6; }
          if (cfg.type === 'bar' && ds.borderRadius === undefined) ds.borderRadius = 4;
        });
        cfg.options = cfg.options || {};
        cfg.options.maintainAspectRatio = false;
        // Cartesian charts: labels stay horizontal (rotated Hebrew is unreadable; fewer ticks instead),
        // grid lines faint, so the data is what stands out.
        if (['bar', 'line', 'scatter', 'bubble'].includes(cfg.type)) {
          cfg.options.scales = cfg.options.scales || {};
          for (const ax of ['x', 'y']) {
            const s = cfg.options.scales[ax] = cfg.options.scales[ax] || {};
            s.ticks = { maxRotation: 0, autoSkip: true, ...(s.ticks || {}) };
            s.grid = { color: DARK ? 'rgba(255,255,255,.08)' : 'rgba(15,23,42,.06)', ...(s.grid || {}) };
          }
        }
        cfg.options.plugins = cfg.options.plugins || {};
        cfg.options.plugins.legend = { rtl: isRtl, textDirection: isRtl ? 'rtl' : 'ltr', ...(oneSeries ? { display: false } : {}), ...(cfg.options.plugins.legend || {}) };
        cfg.options.plugins.tooltip = { rtl: isRtl, textDirection: isRtl ? 'rtl' : 'ltr', ...(cfg.options.plugins.tooltip || {}) };
        if (!c.parentElement.classList.contains('chart')) { const w = document.createElement('div'); w.className = 'chart'; c.replaceWith(w); w.appendChild(c); }
        chartInstances.push(new Chart(c, cfg));
      } catch (e) { console.warn('chart', ci, e); }
    });
  }
  // ---------- what-if blocks (H#66c, 30/08): inputs drive numbers and charts, no script in the content ----------
  // <div class="whatif" [data-vars='{"fixed":25}']> holds <input data-var="name"> (range / number / select /
  // checkbox), <output data-out="name">, elements with data-calc="expr" (every var and Math in scope;
  // data-format="₪" | "$" | "€" | "%" | "0" | "0.0"), and charts whose dataset `data` entries are strings —
  // expressions re-evaluated on every input. Expressions come from the agent's content, like everything else.
  $$('.whatif', content).forEach((box) => {
    const inputs = $$('[data-var]', box);
    const vars = () => {
      const v = {};
      try { Object.assign(v, JSON.parse(box.dataset.vars || '{}')); } catch { /* no fixed vars */ }
      inputs.forEach((i) => { v[i.dataset.var] = i.type === 'checkbox' ? (i.checked ? 1 : 0) : Number(i.value); });
      return v;
    };
    const fmt = (n, f) => {
      if (!Number.isFinite(n)) return '—';
      if (f === '%') return `${Math.round(n * 10) / 10}%`;
      if (f === '₪' || f === '$' || f === '€') return `${f}${Math.round(n).toLocaleString('en-US')}`;
      if (f === '0.0') return n.toFixed(1);
      if (f === '0') return Math.round(n).toLocaleString('en-US');
      return (Number.isInteger(n) ? n : Math.round(n * 100) / 100).toLocaleString('en-US');
    };
    const evalExpr = (expr, v) => { try { return Function(...Object.keys(v), 'Math', `"use strict"; return (${expr});`)(...Object.values(v), Math); } catch { return NaN; } };
    const charts = $$('canvas[data-chart]', box).map((c) => { try { return { c, tpl: JSON.parse(c.dataset.chart) }; } catch { return null; } }).filter(Boolean);
    const update = () => {
      const v = vars();
      $$('[data-out]', box).forEach((o) => { const src = inputs.find((x) => x.dataset.var === o.dataset.out); o.textContent = fmt(v[o.dataset.out], o.dataset.format || src?.dataset.format); });
      $$('[data-calc]', box).forEach((el) => { el.textContent = fmt(evalExpr(el.dataset.calc, v), el.dataset.format); });
      charts.forEach(({ c, tpl }) => {
        const ch = chartInstances.find((x) => x.canvas === c); if (!ch) return;
        (tpl.data?.datasets || []).forEach((ds, i) => { const t = ch.data.datasets[i]; if (t) t.data = (ds.data || []).map((d) => (typeof d === 'string' ? evalExpr(d, v) : d)); });
        ch.update();
      });
    };
    inputs.forEach((i) => i.addEventListener('input', update));
    update();
  });

  // Printing changes the page width; Chart.js only listens to window resize, so a chart printed
  // at screen width was clipped. Resize every chart when the print layout is applied and again after.
  window.addEventListener('beforeprint', () => chartInstances.forEach((ch) => { try { ch.resize(); } catch { /* disposed */ } }));
  window.addEventListener('afterprint', () => chartInstances.forEach((ch) => { try { ch.resize(); } catch { /* disposed */ } }));
  // Print opens every closed <details> (a chart's data table, optional detail) and closes them
  // again after: CSS cannot show the content of a closed details in Chrome.
  window.addEventListener('beforeprint', () => $$('details:not([open])', content).forEach((d) => { d.open = true; d.dataset.printOpened = '1'; }));
  window.addEventListener('afterprint', () => $$('details[data-print-opened]', content).forEach((d) => { d.open = false; delete d.dataset.printOpened; }));

  // KPI rows balance: 5 tiles that fit 4 to a row become 3 + 2, not 4 + 1 lonely tile.
  function balanceKpis() {
    $$('.kpis', content).forEach((k) => {
      const n = k.children.length;
      if (n < 2) return;
      const fit = Math.max(1, Math.floor((k.clientWidth + 12) / (150 + 12)));
      const cols = Math.ceil(n / Math.ceil(n / fit));
      k.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
    });
  }
  balanceKpis();
  // the text column changes width without a window resize (the cards column opens or closes):
  // tables re-measure whether they must scroll, KPI rows re-balance
  new ResizeObserver(() => { balanceKpis(); fitTables(); }).observe(content);

  // sortable tables: every table with a header row (opt out with data-sort="off").
  // A header click cycles ascending → descending → the original order.
  $$('table', content).forEach((table) => {
    if (table.dataset.sort === 'off' || !$('thead th', table)) return;
    table.classList.add('sortable');
    const ths = $$('thead th', table).filter((th) => th.closest('table') === table);
    const tbody = $('tbody', table) || table;
    const original = $$('tr', tbody).filter((r) => r.parentElement === tbody);
    // a header is a button for the keyboard too: Tab reaches it, Enter or Space sorts (review 29/09)
    ths.forEach((th) => {
      th.tabIndex = 0; th.setAttribute('aria-sort', 'none');
      th.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); th.click(); } });
    });
    ths.forEach((th, idx) => th.addEventListener('click', () => {
      const dir = th.classList.contains('asc') ? 'desc' : th.classList.contains('desc') ? null : 'asc';
      ths.forEach((t) => { t.classList.remove('asc', 'desc'); t.setAttribute('aria-sort', 'none'); });
      if (!dir) { original.forEach((r) => tbody.appendChild(r)); scheduleLayout(); return; }
      th.classList.add(dir); th.setAttribute('aria-sort', dir === 'asc' ? 'ascending' : 'descending');
      const rows = $$('tr', tbody).filter((r) => r.parentElement === tbody);
      // sort value: data-sort, else data-value / data-delta, else the cell text without our own marks
      // (rank medallion, delta chip, sparkline) — "1 91" must sort as 91, not 191
      const cellText = (c) => { if (!c.querySelector('.rank, .delta, .bar-t, svg, .c-badge')) return c.textContent; const k = c.cloneNode(true); $$('.rank, .delta, .bar-t, svg, .c-badge', k).forEach((x) => x.remove()); return k.textContent; };
      const val = (r) => { const c = r.children[idx]; const t = c ? norm(c.dataset.sort ?? c.dataset.value ?? (c.dataset.delta !== undefined && !norm(cellText(c)) ? c.dataset.delta : cellText(c))) : ''; const n = Number(t.replace(/[^\d.-]/g, '')); return { t, n: t !== '' && /^[\s\d.,%₪$€+-]+$/.test(t) && !Number.isNaN(n) ? n : null }; };
      rows.sort((a, b) => { const va = val(a), vb = val(b); const c = va.n !== null && vb.n !== null ? va.n - vb.n : va.t.localeCompare(vb.t, LOCALE, { numeric: true }); return dir === 'asc' ? c : -c; });
      rows.forEach((r) => tbody.appendChild(r));
      scheduleLayout();
    }));
  });

  // file trees: direction follows the script of the names inside (paths, file names), not the page.
  // An English tree on a Hebrew page is LTR and left-aligned; the descriptions ride along (user, 28/08).
  $$(".tree", content).forEach((tree) => {
    const names = $$("code", tree).map((c) => c.textContent).join("");
    const heb = (names.match(/[\u0590-\u05FF]/g) || []).length;
    const lat = (names.match(/[A-Za-z]/g) || []).length;
    if (heb || lat) tree.setAttribute("dir", lat >= heb ? "ltr" : "rtl");
  });

  // ---------- table decorations ----------
  // Declarative: the agent marks a column (<th data-heat|data-bar|data-delta|data-rank>) or a
  // cell (<td data-bar="62"> / data-spark / data-delta), the page computes the colors, so every
  // page colors the same way and the agent never hand-picks a hex. Snippets: references/components.md.
  const numOf = (cell) => {
    const t = norm(cell.dataset.value ?? cell.dataset.sort ?? cell.textContent);
    if (t === '' || !/^[\s\d.,%₪$€+-]+$/.test(t)) return null;
    const n = Number(t.replace(/[^\d.-]/g, ''));
    return Number.isNaN(n) ? null : n;
  };
  const fmtNum = (n) => Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100);
  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = hexRgb(a), B = hexRgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`; };
  // scales: seq = white → blue (who is higher), rg = red → amber → green (bad → good), div = red / white / green around a center
  const SEQ = DARK ? ['#171c28', '#3b82f6'] : ['#ffffff', '#1d4ed8'];
  const RG = DARK ? ['#7f1d1d', '#713f12', '#14532d'] : ['#fecaca', '#fde68a', '#bbf7d0']; // 200s: the 300s shouted over the rest of the page (review 29/09)
  const PAPER = DARK ? '#171c28' : '#ffffff';
  const scaleColor = (kind, t) => {
    if (kind === 'rg') return t < 0.5 ? mix(RG[0], RG[1], t * 2) : mix(RG[1], RG[2], (t - 0.5) * 2);
    return mix(SEQ[0], SEQ[1], 0.06 + 0.64 * t);
  };
  const bodyRows = (table) => $$('tbody tr', table).filter((r) => r.closest('table') === table);
  const colCells = (table, idx) => bodyRows(table).map((r) => r.children[idx]).filter((c) => c && c.tagName === 'TD');
  function legendFor(table, html) {
    const wrap = table.closest('.table-wrap') || table;
    let lg = wrap.nextElementSibling;
    if (!lg || !lg.classList.contains('tbl-legend')) { lg = document.createElement('div'); lg.className = 'tbl-legend'; wrap.after(lg); }
    lg.insertAdjacentHTML('beforeend', html);
  }
  function applyHeat(cells, spec) {
    // spec: { mode: 'seq'|'rg'|'div', desc, thresholds: number[]|null, labels: string[]|null, center, title }
    const vals = cells.map(numOf);
    const nums = vals.filter((v) => v !== null);
    if (nums.length < 2) return;
    const min = Math.min(...nums), max = Math.max(...nums);
    const kind = spec.mode === 'rg' || spec.thresholds ? 'rg' : 'seq';
    cells.forEach((c, i) => {
      const v = vals[i];
      if (v === null) return;
      let bg, fg = null;
      if (spec.mode === 'div') {
        const center = spec.center ?? 0;
        const span = Math.max(Math.abs(max - center), Math.abs(min - center)) || 1;
        const t = Math.min(1, Math.abs(v - center) / span);
        const good = spec.desc ? v < center : v > center;
        bg = v === center ? PAPER : mix(PAPER, good ? RG[2] : RG[0], 0.25 + 0.75 * t);
      } else if (spec.thresholds) {
        let band = spec.thresholds.filter((th) => v >= th).length; // 0..n
        const n = spec.thresholds.length;
        let t = n ? band / n : 0;
        if (spec.desc) t = 1 - t;
        bg = scaleColor('rg', t);
      } else {
        let t = max === min ? 0.5 : (v - min) / (max - min);
        if (spec.desc) t = 1 - t;
        bg = scaleColor(kind, t);
        if (kind === 'seq' && t > 0.62) fg = '#fff';
        if (DARK && kind === 'rg') fg = '#f1f5f9';
      }
      c.classList.add('heat');
      c.style.setProperty('--heat-bg', bg);
      if (fg) c.style.setProperty('--heat-fg', fg);
    });
    return { min, max, kind };
  }
  function heatLegend(table, spec, stats, title) {
    if (!stats) return;
    const label = title ? `<span>${esc(title)}:</span>` : '';
    if (spec.thresholds) {
      const th = spec.thresholds; const n = th.length;
      const names = spec.labels || (n === 2 ? [T.legendBad, T.legendMid, T.legendGood] : null);
      const chips = [];
      for (let b = 0; b <= n; b++) {
        let t = n ? b / n : 0; if (spec.desc) t = 1 - t;
        const range = b === 0 ? `&lt; ${fmtNum(th[0])}` : b === n ? `≥ ${fmtNum(th[n - 1])}` : `${fmtNum(th[b - 1])}–${fmtNum(th[b])}`;
        const name = names ? names[spec.desc ? n - b : b] : '';
        chips.push(`<span class="chip" style="background:${scaleColor('rg', t)}">${name ? `${esc(name)} ` : ''}${range}</span>`);
      }
      legendFor(table, `${label}${chips.join('')}`);
    } else if (spec.mode === 'div') {
      legendFor(table, `${label}<span class="chip" style="background:${RG[0]}">${spec.desc ? T.above : T.below} ${fmtNum(spec.center ?? 0)}</span><span class="chip" style="background:${RG[2]}">${spec.desc ? T.below : T.above} ${fmtNum(spec.center ?? 0)}</span>`);
    } else {
      // low to high, always; "desc" reverses the colors, not the numbers (720 → 15 read backwards, review 29/09)
      const lo = stats.min, hi = stats.max;
      const stops = stats.kind === 'rg' ? [RG[0], RG[1], RG[2]] : [scaleColor('seq', 0), scaleColor('seq', 1)];
      if (spec.desc) stops.reverse();
      const g = `linear-gradient(to left, ${stops.join(', ')})`;
      const gl = isRtl ? g : g.replace('to left', 'to right');
      legendFor(table, `${label}<span>${fmtNum(lo)}</span><span class="grad" style="background:${gl}"></span><span>${fmtNum(hi)}</span>`);
    }
  }
  const parseHeat = (el) => {
    const raw = norm(el.dataset.heat || '').toLowerCase();
    const parts = raw.split(/[\s,]+/).filter(Boolean);
    const spec = { mode: parts.includes('rg') ? 'rg' : parts.includes('div') || parts.includes('diverging') ? 'div' : 'seq', desc: parts.includes('desc'), thresholds: null, labels: null, center: undefined };
    if (el.dataset.thresholds) spec.thresholds = el.dataset.thresholds.split(/[\s,]+/).map(Number).filter((n) => !Number.isNaN(n)).sort((a, b) => a - b);
    if (el.dataset.labels) spec.labels = el.dataset.labels.split(/\s*,\s*/);
    if (el.dataset.center !== undefined) spec.center = Number(el.dataset.center) || 0;
    return spec;
  };
  $$('table', content).forEach((table) => {
    const ths = $$('thead th', table).filter((th) => th.closest('table') === table);
    const rows = bodyRows(table);
    // whole-table heat (class heatmap or data-heat on the table)
    if (table.dataset.heat !== undefined || table.classList.contains('heatmap')) {
      const spec = parseHeat(table);
      const cells = rows.flatMap((r) => Array.from(r.children).filter((c) => c.tagName === 'TD' && numOf(c) !== null));
      heatLegend(table, spec, applyHeat(cells, spec), table.dataset.legend);
    }
    ths.forEach((th, idx) => {
      const cells = colCells(table, idx);
      if (th.dataset.heat !== undefined) { const spec = parseHeat(th); heatLegend(table, spec, applyHeat(cells, spec), th.dataset.legend ?? norm(th.textContent)); }
      if (th.dataset.bar !== undefined) {
        const nums = cells.map(numOf).filter((v) => v !== null);
        const max = Number(th.dataset.barMax) || (nums.some((v) => v > 100) ? Math.max(...nums) : 100);
        cells.forEach((c) => { if (c.dataset.bar === undefined && numOf(c) !== null) c.dataset.bar = `${numOf(c)}/${max}`; });
      }
      if (th.dataset.sparkGood) cells.forEach((c) => { if (c.dataset.spark !== undefined && !c.dataset.sparkGood) c.dataset.sparkGood = th.dataset.sparkGood; });
      if (th.dataset.delta !== undefined) cells.forEach((c) => { if (c.dataset.delta === undefined && numOf(c) !== null) { c.dataset.delta = norm(c.textContent); c.textContent = ''; if (th.dataset.deltaGood) c.dataset.deltaGood = th.dataset.deltaGood; } });
      if (th.dataset.rank !== undefined) {
        const asc = norm(th.dataset.rank).toLowerCase() === 'asc';
        const scored = cells.map((c) => ({ c, v: numOf(c) })).filter((x) => x.v !== null).sort((a, b) => asc ? a.v - b.v : b.v - a.v);
        scored.forEach((x, i) => { const r = i > 0 && scored[i - 1].v === x.v ? Number(scored[i - 1].c.dataset.rankN) : i + 1; x.c.dataset.rankN = r; x.c.insertAdjacentHTML('afterbegin', `<span class="rank r${r}">${r}</span>`); });
      }
    });
    // per-cell bars, sparklines, deltas
    $$('td[data-bar]', table).forEach((c) => {
      const spec = norm(c.dataset.bar);
      let v, max = 100;
      if (spec.includes('/')) { [v, max] = spec.split('/').map(Number); } else v = spec === '' ? numOf(c) : Number(spec);
      if (v === null || Number.isNaN(v) || !max) return;
      const pct = Math.max(0, Math.min(100, (v / max) * 100));
      c.classList.add('bar');
      if (c.dataset.tone) c.classList.add(c.dataset.tone);
      c.style.setProperty('--pct', pct.toFixed(1));
      if (spec.includes('/') && !c.textContent.trim()) c.innerHTML = `${fmtNum(v)}<span class="bar-t">/ ${fmtNum(max)}</span>`;
      else if (!c.textContent.trim()) c.textContent = `${fmtNum(pct)}%`;
    });
    $$('td[data-spark]', table).forEach((c) => {
      const pts = c.dataset.spark.split(/[\s,]+/).map(Number).filter((n) => !Number.isNaN(n));
      if (pts.length < 2) return;
      const W = 84, H = 24, lo = Math.min(...pts), hi = Math.max(...pts), span = hi - lo || 1;
      const xy = pts.map((p, i) => [(i / (pts.length - 1)) * W, H - 2 - ((p - lo) / span) * (H - 4)]);
      // rising is good unless data-spark-good="down" (costs, failures, latency), the same rule as a delta's
      // data-delta-good: otherwise a falling failure count drew red next to its green ▼ chip
      const goodDown = (c.dataset.sparkGood || '').toLowerCase() === 'down';
      const rise = pts[pts.length - 1] > pts[0], fall = pts[pts.length - 1] < pts[0];
      const tone = c.dataset.tone || (rise ? (goodDown ? 'danger' : 'ok') : fall ? (goodDown ? 'ok' : 'danger') : '');
      const last = xy[xy.length - 1];
      c.classList.add('spark');
      c.insertAdjacentHTML('afterbegin', `<svg class="spark ${tone}" viewBox="0 0 ${W} ${H}" aria-hidden="true" style="color:${tone === 'ok' ? 'var(--ok)' : tone === 'danger' ? 'var(--danger)' : 'var(--accent)'}"><polyline points="${xy.map((p) => p.map((n) => n.toFixed(1)).join(',')).join(' ')}"/><circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="2.2"/></svg> `);
    });
    $$('td[data-delta]', table).forEach((c) => {
      const raw = norm(c.dataset.delta);
      const n = Number(raw.replace(/[^\d.-]/g, ''));
      if (raw === '' || Number.isNaN(n)) return;
      const goodDown = (c.dataset.deltaGood || '').toLowerCase() === 'down';
      const cls = n === 0 ? 'flat' : (n > 0) !== goodDown ? 'up' : 'down';
      const arrow = n === 0 ? '=' : n > 0 ? '▲' : '▼';
      c.insertAdjacentHTML('beforeend', `<span class="delta ${cls}">${arrow} ${esc(raw.replace(/^[+-]/, ''))}</span>`);
    });
    // long tables: a filter box and a sticky header
    const wantFilter = table.dataset.filter !== undefined ? table.dataset.filter !== 'off' : rows.length > 12;
    if (wantFilter && rows.length > 1) {
      const wrap = table.closest('.table-wrap') || table;
      const box = document.createElement('div'); box.className = 'tbl-filter';
      box.innerHTML = `<input type="search" placeholder="${esc(T.filter)}" aria-label="${esc(T.filter)}"><span class="cnt"></span>`;
      wrap.before(box);
      const inp = $('input', box), cnt = $('.cnt', box);
      const run = () => { const q = norm(inp.value).toLowerCase(); let shown = 0; rows.forEach((r) => { const hit = !q || norm(r.innerText).toLowerCase().includes(q); r.hidden = !hit; if (hit) shown++; }); cnt.textContent = q ? `${shown} / ${rows.length}` : ''; scheduleLayout(); };
      inp.addEventListener('input', run);
    }
    if (rows.length > 8) table.classList.add('sticky-head');
  });
  // the wrapper scrolls only when the table is really wider than its box (see plan.css)
  const fitTables = () => $$('.table-wrap', content).forEach((w) => { const t = w.querySelector('table'); if (t) { w.classList.toggle('scrolls', t.scrollWidth > w.clientWidth + 1); watchScroll(w); } });
  // A box that scrolls sideways fades out on the side that has more, or a cut-off column looks like
  // the end of the table (review 29/09). Physical sides: in RTL scrollLeft runs from 0 to -max.
  function watchScroll(el) {
    const mark = () => {
      const max = el.scrollWidth - el.clientWidth, x = el.scrollLeft;
      const rtl = getComputedStyle(el).direction === 'rtl';
      const left = max > 1 && (rtl ? x > -max + 1 : x > 1), right = max > 1 && (rtl ? x < -1 : x < max - 1);
      el.classList.toggle('fade-l', left); el.classList.toggle('fade-r', right);
      // a box that scrolls must be reachable by keyboard, or its hidden part is out of reach (WCAG 2.1.1)
      if (max > 1 && !el.hasAttribute('tabindex')) { el.tabIndex = 0; el.dataset.scrollTab = '1'; }
      else if (max <= 1 && el.dataset.scrollTab) { el.removeAttribute('tabindex'); delete el.dataset.scrollTab; }
    };
    if (!el.dataset.fadeWatch) { el.dataset.fadeWatch = '1'; el.addEventListener('scroll', mark, { passive: true }); }
    mark();
  }
  fitTables();
  window.addEventListener('resize', fitTables);

  // code blocks: copy button + syntax highlighting (vendor/highlight.min.js, common languages)
  $$('pre', content).forEach((pre) => {
    if (pre.classList.contains('mermaid')) return;
    const code = pre.querySelector('code');
    if (window.hljs && code && !code.classList.contains('nohighlight')) {
      try {
        const explicit = Array.from(code.classList).some((k) => /^(language|lang)-/.test(k));
        if (explicit) hljs.highlightElement(code);
        else { const r = hljs.highlightAuto(code.textContent); if (r.relevance >= 6) { code.innerHTML = r.value; code.classList.add('hljs'); } }
      } catch (e) { console.warn('hljs', e); }
    }
    const b = document.createElement('button'); b.type = 'button'; b.className = 'copy-btn'; b.textContent = T.copy; b.title = T.copy;
    b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText((code || pre).innerText.replace(/\n$/, '')); b.textContent = T.copied; b.classList.add('done'); setTimeout(() => { b.textContent = T.copy; b.classList.remove('done'); }, 1400); } catch { /* clipboard blocked */ }
    });
    pre.appendChild(b);
  });

  // tabs
  $$('.tabs', content).forEach((tabs) => {
    const btns = $$('[role="tab"]', tabs);
    const panels = $$('[role="tabpanel"]', tabs);
    const select = (b) => { btns.forEach((x) => x.setAttribute('aria-selected', x === b ? 'true' : 'false')); panels.forEach((p) => { p.hidden = p.id !== b.getAttribute('aria-controls'); }); fitTables(); runMermaid(); scheduleLayout(); };
    btns.forEach((b) => b.addEventListener('click', () => select(b)));
    const initial = btns.find((b) => b.getAttribute('aria-selected') === 'true') || btns[0];
    if (initial) select(initial);
  });
  runMermaid();
  // a table or a diagram inside a closed <details> is measured when it opens (toggle does not bubble)
  content.addEventListener('toggle', (e) => { if (e.target.open) { fitTables(); runMermaid(); scheduleLayout(); } }, true);

  // ---------- anchors ----------
  function sectionHead(el) {
    const h2s = $$('h2', content);
    let best = null;
    for (const h of h2s) { if (h === el || (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING)) best = h; else break; }
    return best;
  }
  function sectionOf(el) { const h = sectionHead(el); return h ? textOf(h) : null; }
  function chainFor(el) {
    const chain = [];
    let cur = el;
    while (cur && cur !== content) {
      if (cur.matches(BLOCK_SEL) || cur.id) {
        const cls = typeof cur.className === 'string' ? cur.className.split(/\s+/).filter((c) => c && !c.startsWith('c-') && c !== 'has-c' && c !== 'table-wrap')[0] : '';
        chain.push({ tag: cur.tagName.toLowerCase(), id: cur.id || undefined, cls: cls || undefined, text: textOf(cur) });
      }
      cur = cur.parentElement;
    }
    return chain;
  }
  const wordsOf = (s) => new Set(norm(s).toLowerCase().split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1));
  function findLink(link, sectionId) {
    if (link.id) { const e = document.getElementById(link.id); if (e && content.contains(e)) return e; }
    if (!link.tag) return null;
    const cands = $$(link.tag, content);
    const key = (s) => String(s || '').replace(/\s+/g, ''); // whitespace-insensitive: survives textContent/innerText differences
    const want = key(link.text);
    let loose = null;
    for (const c of cands) {
      const t = key(textOf(c));
      if (t === want) return c;
      if (!loose && want.length >= 10 && t.startsWith(want.slice(0, 32))) loose = c;
    }
    if (loose) return loose;
    // Reworded between versions ("signed RS256" → "signed RS256 (kept, see thread)"): the block of
    // the same kind whose words overlap most, a bonus for staying in the same section. Without this
    // a small edit sent the comment up to the whole table.
    const W = wordsOf(link.text);
    if (W.size < 3) return null;
    let best = null, bestScore = 0;
    for (const c of cands) {
      const C = wordsOf(textOf(c));
      if (!C.size) continue;
      let common = 0; W.forEach((w) => { if (C.has(w)) common++; });
      const score = (2 * common) / (W.size + C.size) + (sectionId && sectionHead(c)?.id === sectionId ? 0.1 : 0);
      if (score > bestScore) { bestScore = score; best = c; }
    }
    return bestScore >= 0.6 ? best : null;
  }
  function resolveAnchor(anchor) {
    const chain = anchor?.chain || [];
    for (let i = 0; i < chain.length; i++) { const el = findLink(chain[i], anchor.sectionId); if (el) return { el, level: i, link: chain[i] }; }
    if (anchor?.section) { const h = $$('h2', content).find((x) => textOf(x) === anchor.section); if (h) return { el: h, level: chain.length, link: { tag: 'h2', text: anchor.section } }; }
    // heading text may be reworded between versions; its id is meant to stay
    if (anchor?.sectionId) { const h = document.getElementById(anchor.sectionId); if (h && content.contains(h)) return { el: h, level: chain.length, link: { tag: 'h2', id: anchor.sectionId, text: textOf(h) } }; }
    return null;
  }
  // "cell "Access token TTL…"" for the reader, not "<code>td</code> Access…"
  const KIND_BY_CLASS = { kpi: 'kKpi', card: 'kCard', callout: 'kCallout', mermaid: 'kDiagram', chart: 'kChart', item: 'kCard', col: 'kSection' };
  const KIND_BY_TAG = { td: 'kCell', th: 'kCell', tr: 'kRow', table: 'kTable', li: 'kItem', dt: 'kItem', dd: 'kItem', p: 'kPara', h1: 'kHeading', h2: 'kHeading', h3: 'kHeading', h4: 'kHeading', h5: 'kHeading', h6: 'kHeading', pre: 'kCode', figure: 'kFigure', blockquote: 'kQuote', details: 'kDetails', summary: 'kDetails', section: 'kSection' };
  const kindOf = (l) => T[KIND_BY_CLASS[l.cls] || KIND_BY_TAG[l.tag] || 'kBlock'];
  const snip = (s, n = 48) => { const t = norm(s); return t.length > n ? `${t.slice(0, n)}…` : t; };
  const describeLink = (l) => l ? `${esc(kindOf(l))}${l.text ? ` <span class="where-snip">"${esc(snip(l.text))}"</span>` : ''}` : '';

  // ---------- state ----------
  let state = { comments: [], versions: [], version: P.version, changed: [] };
  let lastJson = '';
  let filter = 'active';
  const resolved = new Map(); // id -> {el, level}
  const marks = new Map();    // id -> mark element of the highlighted quote (when the quote was found)
  const banner = $('#banner');
  const panel = $('#panel');
  let serverDown = false;
  const byId = (id) => state.comments.find((t) => t.id === id);

  function setBanner(kind, text) {
    if (!text) { banner.hidden = true; return; }
    banner.hidden = false; banner.className = `banner ${kind}`; banner.textContent = text;
    if (P.readonly && kind === 'info') { const a = document.createElement('a'); a.href = `/${encodeURIComponent(P.dir)}/`; a.className = 'banner-link'; a.textContent = T.backCurrent; banner.append(' · ', a); }
  }
  if (P.readonly) setBanner('info', T.readonly);

  function clearMarkers() {
    $$('.c-badge', content).forEach((b) => b.remove());
    $$('.has-c', content).forEach((el) => el.classList.remove('has-c', 'c-open', 'c-waiting', 'c-closed'));
    $$('mark.c-quote', content).forEach((m) => { const p = m.parentNode; while (m.firstChild) p.insertBefore(m.firstChild, m); m.remove(); p.normalize(); });
    marks.clear();
  }
  function highlightQuote(el, quote, status) {
    if (!quote || quote.length < 3) return null;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const i = node.data.indexOf(quote);
      if (i >= 0) {
        const range = document.createRange(); range.setStart(node, i); range.setEnd(node, i + quote.length);
        const mark = document.createElement('mark'); mark.className = `c-quote ${status}`;
        try { range.surroundContents(mark); return mark; } catch { return null; /* crosses elements — skip */ }
      }
    }
    return null;
  }
  // ---------- "I am done": wake the agent ----------
  // Writes wake.json on the server; an agent that armed `server.mjs wait` (a Monitor) is re-invoked.
  // ---------- context meter: how full the serving agent's context is ----------
  // The server reads the newest transcript of this project (or the plan's own session) and
  // returns the last API usage. Polled every 10s; hidden when there is nothing to show.
  const ctxEl = $('#ctxMeter');
  let ctxData = null; // last /ctx answer; the agent-status widget reads ownActiveAt from it
  const fmtK = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(n % 1e6 ? 1 : 0)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n));
  async function pollCtx() {
    if (!ctxEl || document.hidden) return;
    try {
      const d = await api('/ctx');
      ctxData = d && (d.used || d.ownActiveAt) ? d : null;
      if (!d || !d.used) { ctxEl.hidden = true; return; }
      const pct = Math.max(0, Math.min(100, Math.round((d.used / d.window) * 100)));
      ctxEl.hidden = false;
      ctxEl.classList.toggle('warn', pct >= 60 && pct < 85);
      ctxEl.classList.toggle('hot', pct >= 85);
      const bar = $('.cmeter-bar', ctxEl);
      const segs = Array.isArray(d.segments) && d.segments.length > 1 ? d.segments : null;
      const when = d.at ? new Date(d.at).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' }) : '';
      const foot = `<div class="cmeter-foot">${esc(d.model || '')} · ${esc((d.sessionId || '').slice(0, 8))} · ${esc(T.ctxUpdated)} ${when}</div>`;
      let tip = $('.cmeter-tip', ctxEl);
      if (!tip) { tip = document.createElement('div'); tip.className = 'cmeter-tip'; ctxEl.appendChild(tip); }
      if (segs) {
        // H#65: one <i> per version, darker as versions go. The whole meter has one instant tooltip (CSS :hover,
        // no title delay): every version top to bottom with its swatch, growth and what was left after it
        const op = (i) => (0.45 + 0.55 * ((i + 1) / segs.length)).toFixed(2);
        bar.innerHTML = segs.map((sg, i) => sg.reset ? '<i class="reset"></i>' : `<i style="width:${Math.max(0, Math.min(100, (sg.delta / d.window) * 100))}%;opacity:${op(i)}"></i>`).join('');
        // every row: swatch, label, a bar relative to the largest row (the remainder counts too), the number alone
        const left = d.window - d.used;
        const maxV = Math.max(1, ...segs.map((sg) => (sg.reset ? 0 : sg.delta))); // the largest version is the full width; the remainder is not in the scale
        const barOf = (v, cls, opacity) => `<span class="cmeter-rbar"><i class="${cls}" style="width:${Math.max(1, Math.min(100, Math.round((v / maxV) * 100)))}%${opacity ? `;opacity:${opacity}` : ''}"></i></span>`;
        tip.innerHTML = segs.map((sg, i) => {
          if (sg.reset) return `<div class="cmeter-row reset"><i></i><span>${esc(T.ctxReset)}</span><span></span><span class="n">${fmtK(sg.used)}</span></div>`;
          const label = sg.tail ? T.ctxSinceLast : `${T.ctxVersion} ${sg.n} · ${hhmm(sg.at)}`;
          return `<div class="cmeter-row"><i style="opacity:${op(i)}"></i><span>${esc(label)}</span>${barOf(sg.delta, '', op(i))}<span class="n">${fmtK(sg.delta)}</span></div>`;
        }).join('') + `<div class="cmeter-row left"><i></i><span>${esc(T.ctxLeft)}</span>${barOf(left, 'left')}<span class="n">${fmtK(left)}</span></div><div class="cmeter-row total"><i></i><span>${esc(T.ctxTotal)}</span><span></span><span class="n">${fmtK(d.used)} / ${fmtK(d.window)}</span></div>` + foot;
      } else {
        bar.innerHTML = `<i style="width:${pct}%"></i>`;
        tip.innerHTML = `<div class="cmeter-row"><i></i><span>${esc(T.ctxTotal)}</span><span></span><span class="n">${fmtK(d.used)}</span></div><div class="cmeter-row left"><i></i><span>${esc(T.ctxLeft)}</span><span></span><span class="n">${fmtK(d.window - d.used)}</span></div>` + foot;
      }
      $('.cmeter-txt', ctxEl).innerHTML = `${esc(T.ctxOf)} <bdi dir="ltr">${pct}% · ${fmtK(d.used)} / ${fmtK(d.window)}</bdi>`;
      ctxEl.removeAttribute('title');
    } catch { ctxEl.hidden = true; ctxData = null; }
  }
  if (ctxEl && !P.readonly) { pollCtx(); setInterval(pollCtx, 10000); document.addEventListener('visibilitychange', () => { if (!document.hidden) pollCtx(); }); }

  // ---------- agent status: one element, one state machine (H#52) ----------
  // States: none (no `wait` of this plan's session heartbeats) · listening · busy (that session's
  // transcript was written in the last 30s: the agent is on something else, a press queues) ·
  // confirm (pressed with unanswered questions: send anyway / keep answering) · sent / late /
  // nobody (wake.json `at`, no `pickedAt`) · picked / working · done (5 minutes). The wake button
  // exists only where a press reaches someone; the ✕ only while a call is pending.
  const ast = $('#agentStatus');
  const astTxt = ast && $('.astatus-txt', ast);
  const astAct = ast && $('.astatus-act', ast);
  const astAct2 = ast && $('.astatus-act2', ast);
  const astX = ast && $('.astatus-x', ast);
  const qAnswered = new Map(); // qid -> bool; filled by the questions section below
  const mmss = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
  const hhmm = (iso) => new Date(iso).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
  let astConfirm = false;
  function astState() {
    const w = state.wake;
    const now = Date.now();
    if (w?.at && !w.doneAt) {
      const since = now - new Date(w.at).getTime();
      if (w.pickedAt || w.workingAt) {
        // the call was delivered, but if the agent's transcript is silent for 3 minutes it probably
        // died on the way (disconnect, crash, a permission prompt) — say so instead of counting forever
        const lastSign = Math.max(new Date(w.workingAt || w.pickedAt).getTime(), ctxData?.ownActiveAt ? new Date(ctxData.ownActiveAt).getTime() : 0);
        if (now - lastSign > 3 * 60000) return { kind: 'stuck', text: `${T.astStuck} ${hhmm(new Date(lastSign).toISOString())}` };
      }
      if (w.workingAt) return { kind: 'working', text: `${T.wakeWorking} · ${mmss(now - new Date(w.workingAt).getTime())}` };
      if (w.pickedAt) return { kind: 'picked', text: `${T.wakePicked} · ${mmss(now - new Date(w.pickedAt).getTime())}` };
      if (!state.listening && !w.listening) return { kind: 'nobody', text: T.wakeSaved }; // not an error: the call is kept and the user has the command
      if (since > 60000) return { kind: 'late', text: `${T.wakeLate} · ${mmss(since)}` };
      return { kind: 'sent', text: `${T.wakeSent} · ${mmss(since)}` };
    }
    // the unanswered-questions gate comes first: a press on the button shown in the "done" state
    // set it, and the "done" return below hid it, so the press did nothing (review 29/09)
    if (astConfirm) { const n = unansweredCount(); if (n) return { kind: 'confirm', text: `${n} ${T.astUnanswered}` }; astConfirm = false; }
    const doneT = w?.doneAt && !w.cancelled ? new Date(w.doneAt).getTime() : 0;
    const openSinceDone = doneT && (state.comments || []).some((t) => t.status === 'open' && new Date(t.messages?.[t.messages.length - 1]?.at || 0).getTime() > doneT);
    if (doneT && !openSinceDone && now - doneT < 5 * 60000) return { kind: 'done', text: `${T.wakeDone}${hhmm(w.doneAt)}` }; // a comment newer than the done stamp cancels the chip: the round is open again
    if (!state.listening) {
      const seen = ctxData?.ownActiveAt || ctxData?.at;
      return { kind: 'none', text: seen ? `${T.astNone} · ${T.astSeen} ${hhmm(seen)}` : T.astNone };
    }
    const act = ctxData?.ownActiveAt ? now - new Date(ctxData.ownActiveAt).getTime() : Infinity;
    if (act < 30000) return { kind: 'busy', text: T.astBusy };
    return { kind: 'listening', text: state.listeningSince ? `${T.astSince} ${hhmm(state.listeningSince)}` : '' };
  }
  function renderWake() {
    if (!ast || P.readonly || !('listening' in state)) return;
    const s = astState();
    ast.hidden = false;
    ast.className = `astatus ${s.kind}${s.kind === 'confirm' && !state.listening ? ' off' : ''}`; // the confirm keeps the dot: green only when someone listens
    astTxt.textContent = s.text;
    astTxt.dataset.short = s.kind === 'none' ? T.astNoneShort : s.kind === 'listening' ? T.astListenShort : ''; // a half-screen window shows this word instead of the sentence
    astTxt.hidden = !s.text;
    const withBtn = ['listening', 'busy', 'confirm', 'none', 'stuck'].includes(s.kind) || (s.kind === 'done' && state.listening);
    astAct.hidden = !withBtn;
    // with nobody listening, the button's honest job is to hand over a command: neutral, not the blue call to action
    astAct.textContent = s.kind === 'confirm' ? T.astSendAnyway : s.kind === 'busy' ? T.astQueue : s.kind === 'stuck' ? T.astResend : s.kind === 'none' ? T.astCopyCmd : T.astWake;
    astAct.className = `astatus-act btn ${s.kind === 'confirm' ? 'small' : s.kind === 'none' ? '' : 'primary'}`;
    astAct2.hidden = s.kind !== 'confirm' && s.kind !== 'nobody';
    astAct2.textContent = s.kind === 'nobody' ? T.astCopy : T.astKeep;
    astX.hidden = !['sent', 'late', 'nobody', 'picked', 'working', 'confirm', 'stuck'].includes(s.kind);
    astX.title = s.kind === 'confirm' ? T.cancel : T.wakeCancel;
    ast.title = s.kind === 'none' ? T.astNoneTitle : s.kind === 'busy' ? T.astBusyTitle : s.kind === 'stuck' ? T.astStuckTitle : withBtn ? T.astWakeTitle : s.kind === 'done' ? '' : T.wakeChipTitle;
    astAct.title = s.kind === 'busy' ? T.astBusyTitle : s.kind === 'none' ? T.astNoneTitle : T.astWakeTitle;
    renderNudge(s.kind);
  }
  // ---------- nudge: comments left, the wake button never pressed ----------
  // At least one open thread whose last word is the user's and is newer than the last call, the
  // button is there to press (listening / busy / none), and the page has been still (no scroll, no
  // typing) for 2 minutes: the button flashes and a bubble asks whether the user forgot to press it.
  // "Still writing" silences it until the user writes something new; the bubble stays up until a
  // choice is made, so reading on does not make it vanish unseen.
  const NUDGE_IDLE = 2 * 60000;
  let lastActivity = Date.now();
  let nudgeSnooze = 0; // time of "still writing": only messages newer than this re-arm the nudge
  let nudgeOn = false;
  let nudgeEl = null;
  const markActive = () => { lastActivity = Date.now(); };
  ['scroll', 'wheel', 'keydown', 'input'].forEach((ev) => document.addEventListener(ev, markActive, { capture: true, passive: true }));
  function pendingUserComments() {
    const w = state.wake;
    const lastCall = w?.at && !w.cancelled ? new Date(w.at).getTime() : 0;
    return (state.comments || []).map((t) => {
      const m = t.messages?.[t.messages.length - 1];
      return t.status === 'open' && m?.role === 'user' ? new Date(m.at || 0).getTime() : 0;
    }).filter((at) => at > lastCall);
  }
  function renderNudge(kind) {
    const pending = ['listening', 'busy', 'none'].includes(kind) && !astConfirm ? pendingUserComments() : [];
    const now = Date.now();
    if (!pending.length) nudgeOn = false;
    else if (!nudgeOn && now - lastActivity >= NUDGE_IDLE && Math.max(...pending) > nudgeSnooze) nudgeOn = true;
    ast.classList.toggle('nudge', nudgeOn);
    if (!nudgeOn) { if (nudgeEl) nudgeEl.hidden = true; return; }
    if (!nudgeEl) {
      nudgeEl = document.createElement('div');
      nudgeEl.className = 'astatus-nudge';
      nudgeEl.setAttribute('role', 'alertdialog');
      nudgeEl.innerHTML = `<b></b><p class="nudge-msg"></p><p>${esc(T.nudgeWhy)}</p><p>${esc(T.nudgeAsk)}</p><div class="nudge-acts"><button type="button" class="btn primary small" data-nudge="go">${esc(T.nudgeGo)}</button><button type="button" class="btn small" data-nudge="later">${esc(T.nudgeLater)}</button></div>`;
      $('b', nudgeEl).textContent = T.nudgeTitle;
      nudgeEl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-nudge]');
        if (!b) return;
        nudgeOn = false;
        if (b.dataset.nudge === 'go') pressWake(); else { nudgeSnooze = Date.now(); markActive(); }
        renderWake();
      });
      ast.appendChild(nudgeEl);
    }
    $('.nudge-msg', nudgeEl).textContent = pending.length === 1 ? T.nudgeOne : `${T.nudgeLeft} ${pending.length} ${T.nudgeMany}`;
    $('[data-nudge="go"]', nudgeEl).textContent = kind === 'none' ? T.nudgeGoCopy : T.nudgeGo;
    nudgeEl.hidden = false;
  }
  function pressWake() { if (astConfirm || !unansweredCount()) return sendWake(); astConfirm = true; renderWake(); }
  async function sendWake() {
    astAct.disabled = true;
    try { state.wake = await api('/wake', { method: 'POST', body: JSON.stringify({ at: new Date().toISOString() }) }); }
    catch { astTxt.textContent = T.wakeFailed; astTxt.hidden = false; }
    astAct.disabled = false;
    astConfirm = false;
    renderWake();
    if (!state.listening) { copyWakeCmd(); notifyNobody(); } // H#68: no Monitor on the other side — hand the user the command
  }
  // the command an agent without a listener runs to read this page (from /state; the server knows its own path)
  async function copyWakeCmd() {
    const cmd = state.wakeCmd || `/markup comments ${P.dir}`;
    try { await navigator.clipboard.writeText(cmd); astTxt.textContent = T.astCopied; astTxt.hidden = false; } catch { window.prompt(T.astCopy, cmd); }
  }
  async function notifyNobody() {
    if (!('Notification' in window)) return;
    try {
      if (Notification.permission === 'default') await Notification.requestPermission();
      if (Notification.permission === 'granted') new Notification(T.astNotif, { body: state.wakeCmd || P.dir });
    } catch { /* blocked */ }
  }
  if (ast) {
    if (P.readonly) ast.hidden = true;
    astAct.addEventListener('click', pressWake);
    astAct2.addEventListener('click', () => { if (astState().kind === 'nobody') return copyWakeCmd(); astConfirm = false; renderWake(); jumpToUnanswered(); });
    astX.addEventListener('click', async () => {
      if (astConfirm) { astConfirm = false; renderWake(); return; }
      try { await api('/wake', { method: 'DELETE' }); } catch { /* server down: local only */ }
      state.wake = { ...(state.wake || {}), doneAt: new Date().toISOString(), cancelled: true };
      renderWake();
    });
    setInterval(renderWake, 1000);
  }

  // ---------- update balloon (V5, 28/09) ----------
  // A newer markup release: one card under the top bar at the inline-end. clean -> "upgrade" (the
  // server swaps the files and restarts, the page reloads on the new startedAt) · modified -> a wake
  // of kind "upgrade": the agent reviews the user's changes, merges, and asks before writing; with
  // no listener the command goes to the clipboard, like the wake button · dev -> the git pull command.
  // "Not now" hides it until a newer version. Read once per page load.
  // Review 29/09: the card covered the text on every page load. A chip in the top bar says a version
  // is out; the card opens under it on a click, and closes on a click elsewhere.
  async function updateBalloon() {
    let u;
    try { const r = await fetch('/api/update'); if (!r.ok) return; u = await r.json(); } catch { return; }
    if (!u.available || u.dismissed) return;
    const el = document.createElement('div');
    el.className = 'upd-balloon';
    el.setAttribute('role', 'status');
    const say = (text, cmd) => { const m = $('.upd-msg', el); m.hidden = !text; m.textContent = text || ''; if (cmd) { const c = document.createElement('code'); c.textContent = cmd; m.append(' ', c); } };
    const copy = async (cmd) => { try { await navigator.clipboard.writeText(cmd); return true; } catch { window.prompt(T.updCopy, cmd); return false; } };
    function render() {
      const act = u.kind === 'clean' ? T.updNow : u.kind === 'modified' ? T.updAgent : T.updCopy;
      el.innerHTML = `<div class="upd-head"><b></b> <span class="upd-v"></span></div><div class="upd-sub"></div>`
        + (u.kind === 'modified' ? `<p class="upd-kind"></p><ul class="upd-files"></ul>` : '')
        + (u.kind === 'dev' ? `<p class="upd-kind"></p><code class="upd-cmd"></code>` : '')
        + (u.notes ? `<details class="upd-notes"><summary></summary><div></div></details>` : '')
        + `<p class="upd-msg" hidden></p><div class="upd-acts"><button type="button" class="btn primary small" data-upd="go"></button><button type="button" class="btn small" data-upd="later"></button></div>`;
      $('b', el).textContent = T.updTitle;
      $('.upd-v', el).textContent = u.latest;
      $('.upd-sub', el).textContent = `${T.updInstalled}: ${u.current}`;
      if (u.kind === 'modified') { $('.upd-kind', el).textContent = T.updModified; $('.upd-files', el).innerHTML = u.modified.slice(0, 8).map((f) => `<li><code>${esc(f)}</code></li>`).join('') + (u.modified.length > 8 ? `<li>+${u.modified.length - 8}</li>` : ''); }
      if (u.kind === 'dev') { $('.upd-kind', el).textContent = T.updDev; $('.upd-cmd', el).textContent = u.devCmd; }
      if (u.notes) { $('.upd-notes summary', el).textContent = T.updNotes; $('.upd-notes div', el).textContent = u.notes; }
      $('[data-upd=go]', el).textContent = act;
      $('[data-upd=later]', el).textContent = T.updLater;
    }
    async function upgradeHere(btn) {
      btn.disabled = true;
      say(T.updRunning);
      let before = null;
      try { before = (await (await fetch('/api/ping')).json()).startedAt; } catch { /* checked again below */ }
      let r;
      try { r = await fetch('/api/upgrade', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); }
      catch (e) { btn.disabled = false; return say(`${T.updFailed} ${e.message}`); }
      const body = await r.json().catch(() => ({}));
      if (r.status === 409 && body.kind === 'modified') { u.kind = 'modified'; render(); return; } // a change the status did not see yet: the agent path
      if (!r.ok || !body.ok) { btn.disabled = false; return say(`${T.updFailed} ${body.error || r.status}`); }
      say(T.updRestart);
      for (let i = 0; i < 40; i++) {
        await new Promise((res) => setTimeout(res, 750));
        try { const pi = await (await fetch('/api/ping')).json(); if (pi.startedAt && pi.startedAt !== before) { location.reload(); return; } } catch { /* restarting */ }
      }
      say(T.updReload);
    }
    async function toAgent(btn) {
      btn.hidden = true;
      try { state.wake = await api('/wake', { method: 'POST', body: JSON.stringify({ kind: 'upgrade' }) }); renderWake(); } catch { /* the command below still works */ }
      if (state.listening) return say(T.updSent);
      await copy(u.agentCmd);
      say(T.updNobody, u.agentCmd);
    }
    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-upd]');
      if (!b) return;
      if (b.dataset.upd === 'later') { try { await fetch('/api/update/dismiss', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ version: u.latest }) }); } catch { /* hidden for this load anyway */ } el.remove(); return; }
      if (u.kind === 'clean') return upgradeHere(b);
      if (u.kind === 'modified') return toAgent(b);
      if (await copy(u.devCmd)) say(T.updCopied);
    });
    render();
    el.hidden = true;
    document.body.appendChild(el);
    const chip = document.createElement('button');
    chip.type = 'button'; chip.className = 'btn small upd-chip'; chip.setAttribute('aria-expanded', 'false');
    chip.textContent = `${T.updChip} ${u.latest}`;
    $('.top-actions')?.prepend(chip);
    const place = () => { const r = chip.getBoundingClientRect(); el.style.top = `${r.bottom + 8}px`; el.style.left = `${Math.max(8, Math.min(isRtl ? r.right - el.offsetWidth : r.left, window.innerWidth - el.offsetWidth - 8))}px`; el.style.insetInlineEnd = 'auto'; };
    chip.addEventListener('click', () => { el.hidden = !el.hidden; chip.setAttribute('aria-expanded', String(!el.hidden)); if (!el.hidden) place(); });
    document.addEventListener('mousedown', (e) => { if (!el.hidden && !el.contains(e.target) && !chip.contains(e.target)) { el.hidden = true; chip.setAttribute('aria-expanded', 'false'); } });
    new MutationObserver(() => { if (!el.isConnected) chip.remove(); }).observe(document.body, { childList: true }); // "Not now" removes the card: the chip goes with it
  }
  if (!P.readonly) updateBalloon();

  // theme toggle: explicit choice in localStorage; a reload re-initializes mermaid, Chart.js and highlight.js
  // "?" in the top bar: how the page works, the report door, the version. The first-visit tip says
  // the same in one line; this is where it lives after the tip is closed, at every width.
  const helpPop = document.createElement('div');
  helpPop.id = 'helpPop'; helpPop.className = 'help-pop'; helpPop.hidden = true; helpPop.setAttribute('role', 'dialog'); helpPop.setAttribute('aria-label', T.helpTitle);
  helpPop.innerHTML = `<strong class="help-title">${esc(T.helpTitle)}</strong><dl>${T.helpRows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`
    + `<div class="help-foot">${P.readonly ? '' : `<button type="button" class="toc-report" data-report><span class="gh-issue" aria-hidden="true"></span> ${esc(T.reportToc)}</button>`}<span class="help-ver">markup ${esc(P.markup || '')}</span></div>`;
  document.body.appendChild(helpPop);
  function closeHelp() { helpPop.hidden = true; $('#helpBtn')?.setAttribute('aria-expanded', 'false'); }
  { const b = $('#helpBtn'); if (b) {
    b.title = T.help; b.setAttribute('aria-label', T.help); b.setAttribute('aria-expanded', 'false');
    b.addEventListener('click', () => {
      if (!helpPop.hidden) return closeHelp();
      helpPop.hidden = false; b.setAttribute('aria-expanded', 'true');
      try { localStorage.setItem('markup:tip-comment', '1'); } catch { /* private mode */ } // the help says what the tip says
      $('.comment-tip')?.setAttribute('hidden', '');
      const r = b.getBoundingClientRect(), w = helpPop.offsetWidth;
      helpPop.style.top = `${r.bottom + 8}px`;
      helpPop.style.left = `${Math.max(8, Math.min(isRtl ? r.right - w : r.left, window.innerWidth - w - 8))}px`;
    });
    document.addEventListener('mousedown', (e) => { if (!helpPop.hidden && !helpPop.contains(e.target) && !b.contains(e.target)) closeHelp(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeHelp(); });
  } }
  // icon-only buttons (✕ 📎 » − ▢ ▾) name themselves by their title for screen readers, including the
  // ones every render creates; a title alone is not announced reliably and never shows on focus
  const nameIcons = (root) => $$('button[title]:not([aria-label])', root).forEach((b) => { if (b.textContent.trim().length <= 2 && b.title) b.setAttribute('aria-label', b.title); });
  nameIcons(document);
  new MutationObserver((ms) => {
    for (const m of ms) {
      if (m.type === 'attributes') { const b = m.target; if (b.tagName === 'BUTTON' && b.title && b.textContent.trim().length <= 2) b.setAttribute('aria-label', b.title); continue; } // a title set later (the fold, the theme) follows
      for (const n of m.addedNodes) if (n.nodeType === 1) nameIcons(n.parentElement || n);
    }
  }).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['title'] });
  $('#versionSel')?.setAttribute('aria-label', T.aVersions); toc.setAttribute('aria-label', T.aToc); $('#floats')?.setAttribute('aria-label', T.aFloats);
  { const b = $('#themeBtn'); if (b) { b.textContent = DARK ? '\u2600' : '\u263E'; b.title = DARK ? T.themeLight : T.themeDark; b.setAttribute('aria-label', b.title); b.addEventListener('click', () => { try { localStorage.setItem('markup:theme', DARK ? 'light' : 'dark'); } catch { /* private mode */ } location.reload(); }); } }

  // print: every tab panel is shown with its tab's label above it (plan.css @media print)
  $$('.tabs', content).forEach((t) => { $$('[role=tab]', t).forEach((b) => { const p = b.getAttribute('aria-controls') && document.getElementById(b.getAttribute('aria-controls')); if (p) p.dataset.printLabel = norm(b.textContent); }); });

  // ---------- selectable questions: a pick is an answer (H#56) ----------
  // Authoring: <div class="q" data-q="I1" data-type="single|multi" [data-cat="ראיון"]> with
  // <label><input type="radio|checkbox"> text</label> options and an optional <textarea data-free>
  // (grows with the text, no length limit). Every question also takes attachments (paperclip or a
  // pasted image), saved like a comment's. Consecutive .q blocks become a guide: a bounded box with
  // a heading, a step strip (numbered circles joined by a line, ✓ when answered), one question on
  // screen, prev / next side by side under the question (next = next unanswered; at the end of the
  // box, the next unanswered anywhere on the page). data-cat splits the run into one box per
  // category ("שאלות לגבי <cat>"), each numbered from 1 (H#57, 30/08: category tabs read as
  // unrelated to the questions). Inside a guide 1-9 pick an option and Enter moves on. The
  // top bar counts answered questions and jumps to the next unanswered one; the wake button asks
  // "send anyway / keep answering" when some are still open. Everything is saved at once to the
  // server (answers.json) and restored on load; `comments` shows it to the agent.
  const qFiles = new Map();  // qid -> saved attachments [{name, file, type, size}]
  const guides = [];         // {el, qs, cat, active, headEl, stepsEl, navEl}
  const qOf = (id) => $$('.q', content).find((q) => q.dataset.q === id);
  const isAnswered = (a) => Boolean(a && ((a.values || []).length || (a.text || '').trim() || (a.attachments || []).length));
  function unansweredCount() { return $$('.q', content).filter((q) => !qAnswered.get(q.dataset.q)).length; }
  function renderQCount() {
    const el = $('#qCount'); if (!el) return;
    const all = $$('.q', content);
    if (!all.length || P.readonly) { el.hidden = true; return; }
    const done = all.filter((q) => qAnswered.get(q.dataset.q)).length;
    el.hidden = false;
    el.textContent = `${T.qCount} ${done} / ${all.length}`;
    el.classList.toggle('all', done === all.length);
    el.title = T.qNextTitle;
  }
  function showQ(q) {
    const g = guides.find((x) => x.qs.includes(q));
    if (g) { g.active = q; renderGuide(g); }
    q.scrollIntoView({ block: 'center', behavior: 'smooth' });
    flash(q);
  }
  function jumpToUnanswered(from) {
    const all = $$('.q', content);
    const start = from ? all.indexOf(from) + 1 : 0;
    const next = all.slice(start).concat(all.slice(0, start)).find((q) => !qAnswered.get(q.dataset.q));
    if (next) showQ(next);
  }
  const qCountEl = $('#qCount');
  if (qCountEl) qCountEl.addEventListener('click', () => jumpToUnanswered());

  // guides: one bounded box per run of .q blocks (per category when data-cat is set), a step strip
  // on top, one question shown, prev / next together under it
  const stepLabel = (q) => norm($('.q-title', q)?.textContent || q.dataset.q).replace(/^[A-Za-z]{0,3}\d+[.:]\s*/, ''); // "Q3. איפה" → "איפה"
  function renderGuide(g) {
    g.stepsEl.innerHTML = g.qs.map((q, i) => `<button type="button" role="tab" data-q="${esc(q.dataset.q)}" class="q-step ${q === g.active ? 'active' : ''} ${qAnswered.get(q.dataset.q) ? 'answered' : ''}" title="${esc(stepLabel(q))}"><span class="q-step-n">${i + 1}</span><span class="q-step-l">${esc(stepLabel(q))}</span></button>`).join('');
    g.qs.forEach((q) => { q.hidden = q !== g.active; });
    const ta = $("textarea[data-free]", g.active); if (ta) growFree(ta); // a textarea measured while hidden is 0px tall
    const i = g.qs.indexOf(g.active);
    const done = g.qs.filter((q) => qAnswered.get(q.dataset.q)).length;
    const countEl = $('.q-guide-count', g.headEl);
    countEl.textContent = `${done} / ${g.qs.length} ${T.qDone}`;
    countEl.classList.toggle('all', done === g.qs.length);
    $('.q-prev', g.navEl).disabled = i <= 0;
    $('.q-next', g.navEl).disabled = i >= g.qs.length - 1 && !unansweredCount();
    $('.q-pos', g.navEl).textContent = `${i + 1} ${T.qOf} ${g.qs.length}`;
    scheduleLayout();
  }
  function guideNext(g) {
    const i = g.qs.indexOf(g.active);
    const after = g.qs.slice(i + 1).find((q) => !qAnswered.get(q.dataset.q)) || g.qs[i + 1];
    if (after) { g.active = after; renderGuide(g); return; }
    jumpToUnanswered(g.active); // end of this box: the next unanswered question anywhere (another category, or back in this one)
  }
  function buildGuides() {
    const seen = new Set();
    $$('.q', content).forEach((q) => {
      if (seen.has(q)) return;
      const run = [q];
      let n = q.nextElementSibling;
      while (n && n.classList.contains('q')) { run.push(n); n = n.nextElementSibling; }
      run.forEach((x) => seen.add(x));
      if (run.length < 2) return;
      // one box per category: consecutive blocks with the same data-cat, in the author's order
      const groups = [];
      run.forEach((x) => { const cat = x.dataset.cat || ''; const last = groups[groups.length - 1]; if (last && last.cat === cat) last.qs.push(x); else groups.push({ cat, qs: [x] }); });
      groups.forEach((grp) => makeGuide(grp.qs, grp.cat));
    });
  }
  function makeGuide(qs, cat) {
    const el = document.createElement('div'); el.className = 'q-guide';
    qs[0].parentNode.insertBefore(el, qs[0]);
    const g = { el, qs, cat, active: qs[0] };
    g.headEl = document.createElement('div'); g.headEl.className = 'q-guide-head';
    g.headEl.innerHTML = `<span class="q-guide-title">${esc(cat ? `${T.qCat} ${cat}` : T.qCount)}</span><span class="q-guide-count"></span>`;
    el.appendChild(g.headEl);
    g.stepsEl = document.createElement('div'); g.stepsEl.className = 'q-steps'; g.stepsEl.setAttribute('role', 'tablist');
    g.stepsEl.addEventListener('click', (e) => { const b = e.target.closest('button[data-q]'); if (!b) return; g.active = qOf(b.dataset.q); renderGuide(g); });
    el.appendChild(g.stepsEl);
    qs.forEach((x) => el.appendChild(x));
    g.navEl = document.createElement('div'); g.navEl.className = 'q-nav';
    g.navEl.innerHTML = `<span class="q-nav-btns"><button type="button" class="btn q-prev">${esc(T.qPrev)}</button><button type="button" class="btn primary q-next" title="${esc(T.qNextTitle)}">${esc(T.qNext)}</button></span><span class="q-pos"></span><span class="q-keys">${esc(T.qKeys)}</span>`;
    $('.q-prev', g.navEl).addEventListener('click', () => { const i = qs.indexOf(g.active); if (i > 0) { g.active = qs[i - 1]; renderGuide(g); } });
    $('.q-next', g.navEl).addEventListener('click', () => guideNext(g));
    el.appendChild(g.navEl);
    guides.push(g);
    renderGuide(g);
  }
  // keys inside a guide: 1-9 pick an option, Enter moves on — never while typing free text
  document.addEventListener('keydown', (e) => {
    if (P.readonly || e.ctrlKey || e.metaKey || e.altKey) return;
    // hovering a guide only counts while nothing else has focus: digits typed into a table filter,
    // or Enter on a button elsewhere, belong to that element
    const idle = e.target === document.body || e.target === document.documentElement;
    const g = guides.find((x) => x.el.contains(e.target)) || (idle ? guides.find((x) => x.el.matches(':hover')) : null);
    if (!g || e.target.matches?.('textarea, select, [contenteditable], input:not([type=radio]):not([type=checkbox])')) return;
    if (/^[1-9]$/.test(e.key)) {
      const opt = $$('input[type=radio], input[type=checkbox]', g.active)[Number(e.key) - 1];
      if (opt) { opt.checked = opt.type === 'checkbox' ? !opt.checked : true; opt.dispatchEvent(new Event('change', { bubbles: true })); e.preventDefault(); }
    } else if (e.key === 'Enter') { guideNext(g); e.preventDefault(); }
  });

  // growing free text + attachments on every question
  const growFree = (t) => { if (t.tagName !== 'TEXTAREA') return; t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 2}px`; };
  $$('.q', content).forEach((q) => {
    const free = $('[data-free]', q);
    if (free && free.tagName === 'TEXTAREA') { free.rows = 2; growFree(free); free.addEventListener('input', () => growFree(free)); }
    if (P.readonly) return;
    const row = document.createElement('div'); row.className = 'q-att';
    row.innerHTML = `<button type="button" class="btn small att-btn q-att-btn" title="${esc(T.attach)}">&#128206;</button><input type="file" multiple hidden><div class="att-list" data-qatt="${esc(q.dataset.q)}" hidden></div>`;
    q.appendChild(row);
    const inp = $('input[type=file]', row);
    $('.q-att-btn', row).addEventListener('click', () => inp.click());
    inp.addEventListener('change', async () => { const files = await collectFiles(inp.files); inp.value = ''; if (files.length) saveAnswer(q, { add: files }); });
    if (free) free.addEventListener('paste', async (e) => { const fs = filesFromPaste(e); if (!fs.length) return; e.preventDefault(); const files = await collectFiles(fs); if (files.length) saveAnswer(q, { add: files }); });
    row.addEventListener('click', (e) => { const rm = e.target.closest('[data-rm]'); if (!rm) return; const list = (qFiles.get(q.dataset.q) || []).slice(); list.splice(Number(rm.dataset.rm), 1); saveAnswer(q, { keep: list.map((a) => a.file) }); });
  });
  function renderQAtt(q) {
    const list = $('.att-list[data-qatt]', q); if (!list) return;
    const files = qFiles.get(q.dataset.q) || [];
    list.innerHTML = files.map((a, i) => `<span class="att-chip">${isImg(a.type) ? `<img src="${attUrl(a)}" alt="">` : '&#128206;'} <a href="${attUrl(a)}" target="_blank" rel="noopener">${esc(a.name)}</a><a data-rm="${i}" title="${esc(T.remove)}">×</a></span>`).join('');
    list.hidden = !files.length;
    scheduleLayout();
  }
  function markAnswered(q, at) {
    let tag = $('.q-saved', q);
    if (!tag) { tag = document.createElement('span'); tag.className = 'q-saved'; q.appendChild(tag); }
    tag.textContent = `${T.answered} ${fmtIso(at)}`;
  }
  function applyAnswer(q, a) {
    qAnswered.set(q.dataset.q, isAnswered(a));
    qFiles.set(q.dataset.q, (a && a.attachments) || []);
    renderQAtt(q);
    if (a && a.at && isAnswered(a)) markAnswered(q, a.at); else $('.q-saved', q)?.remove();
    const g = guides.find((x) => x.qs.includes(q)); if (g) renderGuide(g);
    renderQCount();
  }
  async function loadAnswers() {
    if (!$('.q', content)) return;
    let all = {};
    try { all = await api('/answers'); } catch { return; }
    $$('.q', content).forEach((q) => {
      const a = all[q.dataset.q];
      if (!a) { applyAnswer(q, null); return; }
      $$('input[type=radio], input[type=checkbox]', q).forEach((i) => { i.checked = (a.values || []).includes(i.value); });
      const free = $('[data-free]', q); if (free) { free.value = a.text || ''; growFree(free); }
      applyAnswer(q, a);
    });
  }
  const answerTimers = new Map();
  function saveAnswer(q, extra) {
    if (P.readonly) return;
    const id = q.dataset.q;
    clearTimeout(answerTimers.get(id));
    const run = async () => {
      const inputs = $$('input[type=radio], input[type=checkbox]', q).filter((i) => i.checked);
      // the "Recommended" pill is not part of the option: the agent read "1. Recommended One week…" (review 29/09)
      const labelText = (i) => { const l = i.closest('label'); if (!l) return i.value; const c = l.cloneNode(true); const rec = Boolean($('.q-rec', c)); $$('input, textarea, .q-rec', c).forEach((x) => x.remove()); return norm(c.textContent) + (rec ? ' (recommended)' : ''); };
      const free = $('[data-free]', q);
      const body = {
        qid: id, type: q.dataset.type === 'multi' ? 'multi' : 'single',
        values: inputs.map((i) => i.value), labels: inputs.map(labelText),
        text: free ? free.value : '', title: norm($('.q-title', q)?.textContent || ''),
        section: (() => { const h = sectionHead(q); return h ? textOf(h) : null; })(),
        keepFiles: (extra && extra.keep) || (qFiles.get(id) || []).map((a) => a.file),
        attachments: (extra && extra.add) || [],
      };
      try { const a = await api('/answers', { method: 'PUT', body: JSON.stringify(body) }); applyAnswer(q, a); } catch { /* server down: banner already says so */ }
    };
    if (extra) run(); else answerTimers.set(id, setTimeout(run, 250));
  }
  content.addEventListener('change', (e) => { const q = e.target.closest('.q'); if (q && !e.target.matches('input[type=file]')) saveAnswer(q); });
  content.addEventListener('input', (e) => { const q = e.target.closest('.q'); if (q && e.target.matches('[data-free]')) saveAnswer(q); });
  if (P.readonly) $$('.q input, .q textarea', content).forEach((i) => { i.disabled = true; });
  buildGuides();
  renderQCount();
  setTimeout(loadAnswers, 300);

  // ---------- drafts: unsent text survives a reload ----------
  // Typed but unsent text is kept in localStorage per plan: one compose draft (with its anchor)
  // and one reply draft per thread. Sending clears it; the server never sees a draft.
  const DRAFT_KEY = `markup:drafts:${P.dir}`;
  let drafts = readJson(DRAFT_KEY, { compose: null, replies: {} });
  const saveDrafts = () => { writeJson(DRAFT_KEY, drafts); if (floatMode) renderPanel(); };
  const replyDraft = (id) => (drafts.replies && drafts.replies[id]) || '';
  function setReplyDraft(id, text) {
    drafts.replies = drafts.replies || {};
    if (text && text.trim()) drafts.replies[id] = text; else delete drafts.replies[id];
    saveDrafts();
  }
  // An edit in progress of one of the user's messages, keyed "<thread>:<message index>". Present =
  // the edit box is open (a re-render or a reload reopens it with the text); absent = closed.
  const editDraft = (id, i) => { const v = (drafts.edits || {})[`${id}:${i}`]; return v === undefined ? null : v; };
  function setEditDraft(id, i, text) {
    drafts.edits = drafts.edits || {};
    if (text === null) delete drafts.edits[`${id}:${i}`]; else drafts.edits[`${id}:${i}`] = text;
    writeJson(DRAFT_KEY, drafts);
  }

  // Files attached but not sent yet (compose box, reply boxes) survive a reload, a stray click that
  // closes the box, and the reload a new version triggers. IndexedDB, not localStorage: one pasted
  // screenshot is ~1MB as a data URL and localStorage holds ~5MB per origin. Keys: "<plan>|compose",
  // "<plan>|reply:<thread>". Failures only cost the persistence, never the page.
  const fileStore = (() => {
    let dbp = null;
    const open = () => dbp || (dbp = new Promise((res, rej) => {
      const r = indexedDB.open('markup', 1);
      r.onupgradeneeded = () => r.result.createObjectStore('files');
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    }));
    const store = async (mode) => (await open()).transaction('files', mode).objectStore('files');
    const done = (req) => new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
    const key = (k) => `${P.dir}|${k}`;
    return {
      async put(k, files) { try { const s = await store('readwrite'); await done(files && files.length ? s.put(files, key(k)) : s.delete(key(k))); } catch { /* no IndexedDB */ } },
      async get(k) { try { return (await done((await store('readonly')).get(key(k)))) || []; } catch { return []; } },
      async replies() {
        try {
          const s = await store('readonly'); const range = IDBKeyRange.bound(key('reply:'), `${key('reply:')}￿`);
          const [keys, vals] = await Promise.all([done(s.getAllKeys(range)), done(s.getAll(range))]);
          return keys.map((k, i) => [String(k).slice(key('reply:').length), vals[i]]);
        } catch { return []; }
      },
    };
  })();
  const saveReplyFiles = (id) => fileStore.put(`reply:${id}`, replyFiles.get(id) || []);
  const saveComposeFiles = () => fileStore.put('compose', composeFiles);

  // ---------- attachments: state + rendering helpers ----------
  // A message may carry files (screenshots mostly). They are sent as data URLs inside the JSON
  // body, stored by the server under the plan's assets/, and referenced by file name.
  const MAX_ATT = 8 * 1024 * 1024;
  const replyFiles = new Map(); // threadId -> [{name, type, data}] pending in that thread's reply box
  let composeFiles = [];        // pending in the new-comment box
  fileStore.replies().then((list) => { list.forEach(([id, files]) => replyFiles.set(id, files)); if (list.length) rerender(); });
  const isImg = (type) => /^image\//.test(type || '');
  const readAsDataUrl = (f) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res({ name: f.name || `paste-${Date.now()}.png`, type: f.type, data: r.result }); r.onerror = rej; r.readAsDataURL(f); });
  async function collectFiles(fileList) { const out = []; for (const f of fileList || []) { if (f.size > MAX_ATT) { alert(T.tooBig); continue; } out.push(await readAsDataUrl(f)); } return out; }
  function filesFromPaste(e) { const files = []; for (const it of e.clipboardData?.items || []) { if (it.kind === 'file') { const f = it.getAsFile(); if (f) files.push(f); } } return files; }
  const attChips = (files) => (files || []).map((f, i) => `<span class="att-chip">${isImg(f.type) ? `<img src="${f.data}" alt="">` : '&#128206;'} ${esc(f.name)}<a data-rm="${i}" title="${esc(T.remove)}">×</a></span>`).join('');
  const editBox = (text) => `<textarea rows="3">${esc(text)}</textarea><div class="compose-actions"><button type="button" class="btn primary small" data-act="saveEdit">${T.save}</button><button type="button" class="btn small" data-act="cancelEdit">${T.cancel}</button></div>`;
  function renderAtt(container, files) { if (!container) return; container.innerHTML = attChips(files); container.hidden = !(files || []).length; scheduleLayout(); }
  const attUrl = (a) => `/${encodeURIComponent(P.dir)}/assets/${encodeURIComponent(a.file)}`;
  const msgAttachments = (m) => (m.attachments || []).length
    ? `<div class="msg-att">${m.attachments.map((a) => isImg(a.type)
        ? `<a href="${attUrl(a)}" target="_blank" rel="noopener"><img src="${attUrl(a)}" alt="${esc(a.name)}" title="${esc(a.name)}"></a>`
        : `<a class="att-file" href="${attUrl(a)}" target="_blank" rel="noopener">&#128206; ${esc(a.name)}</a>`).join('')}</div>`
    : '';

  // One request per send box at a time: a double click (or Ctrl+Enter pressed twice) posted the
  // comment twice. The button is disabled while the request runs; a failure keeps the text and says so.
  const inflight = new Set();
  async function sendOnce(key, btn, request, onOk) {
    if (inflight.has(key)) return false;
    inflight.add(key); if (btn) btn.disabled = true;
    try { await request(); onOk?.(); return true; }
    catch { alert(T.sendFailed); return false; }
    finally { inflight.delete(key); if (btn) btn.disabled = false; }
  }

  const RANK = { open: 3, waiting: 2, closed: 1 };
  function renderMarkers() {
    clearMarkers();
    resolved.clear();
    const perEl = new Map();
    const visible = state.comments.slice().sort((a, b) => (a.n || 0) - (b.n || 0));
    for (const t of visible) {
      const r = resolveAnchor(t.anchor);
      if (!r) continue;
      resolved.set(t.id, r);
      if (!perEl.has(r.el)) perEl.set(r.el, []);
      perEl.get(r.el).push(t);
      if (r.level === 0 && t.anchor?.quote) { const m = highlightQuote(r.el, t.anchor.quote, t.status); if (m) marks.set(t.id, m); }
    }
    for (const [el, threads] of perEl) {
      const top = threads.reduce((m, t) => (RANK[t.status] > RANK[m] ? t.status : m), 'closed');
      el.classList.add('has-c', `c-${top}`);
      // A comment made on a selection carries its badge on the highlighted words themselves, not
      // on the corner of the block: the reader sees what the remark is about at a glance. Only
      // block-level comments (no quote, or a quote that could not be re-found) sit on the block.
      let onBlock = 0;
      threads.forEach((t) => {
        const b = document.createElement('span');
        b.className = `c-badge ${t.status}`; b.textContent = `#${t.n}`; b.dataset.id = t.id; b.title = (t.messages?.[0]?.text || '').slice(0, 140);
        const m = marks.get(t.id);
        if (m) { b.classList.add('on-quote'); m.appendChild(b); }
        else { b.style.insetInlineEnd = `${-8 + onBlock++ * 30}px`; el.appendChild(b); }
      });
    }
  }
  content.addEventListener('click', (e) => {
    const b = e.target.closest('.c-badge');
    if (!b) return;
    e.preventDefault(); e.stopPropagation();
    if (floatMode) return showFloat(b.dataset.id);
    openPanel(); focusThread(b.dataset.id);
  });

  // ---------- panel ----------
  const threadsEl = $('#threads');
  const filtersEl = $('#filters');
  const changesEl = $('#changes');
  const floatsEl = $('#floats');
  const linesEl = $('#floatLines');
  const linesTopEl = $('#floatLinesTop');
  $('#panelHint').textContent = T.hint;

  // H#73: preferences shared by every project (~/.markup/prefs.json); GET reads, PUT merges
  const prefsApi = async (opts = {}) => { const r = await fetch('/api/prefs', { headers: { 'Content-Type': 'application/json' }, ...opts }); if (!r.ok) throw new Error(`${r.status}`); return r.json(); };
  // The open/closed state is the user's, not ours: one choice for every page and project (29/09),
  // kept in localStorage and in the shared prefs.json (`panelCollapsed`), and no action (posting a
  // comment included) opens the panel behind their back. Only an explicit click on a comment badge
  // or on the toggle changes it. Nothing saved yet: open on a large window, closed otherwise. The
  // bottom sheet of narrow windows always starts closed and its open/close is not saved.
  const COLLAPSE_KEY = 'markup:panel-collapsed';
  const PANEL_WIDE = 1500;
  let panelTouched = false; // the user opened or folded it in this load: a late server value must not undo that
  const saveCollapsed = () => {
    panelTouched = true;
    if (isNarrow()) return;
    const v = panel.classList.contains('collapsed');
    writeJson(COLLAPSE_KEY, v);
    prefsApi({ method: 'PUT', body: JSON.stringify({ panelCollapsed: v }) }).catch(() => { /* server down: local only */ });
  };
  const applyCollapsed = (saved) => {
    panel.classList.toggle('collapsed', isNarrow() || (typeof saved === 'boolean' ? saved : window.innerWidth < PANEL_WIDE));
  };
  // Fold (») always lands in anchored mode with the panel as a thin strip; opening again restores
  // the mode that was on before the fold (comment #2 on html-roadmap, 30/08).
  const FOLD_PREV_KEY = 'markup:mode-before-fold';
  function restoreModeAfterFold() {
    let prev = null;
    try { prev = localStorage.getItem(FOLD_PREV_KEY); localStorage.removeItem(FOLD_PREV_KEY); } catch { /* private mode */ }
    if (prev === 'panel' && storedFloat) { setStoredFloat(false); applyMode(); }
  }
  function openPanel() { panel.classList.remove('collapsed'); saveCollapsed(); restoreModeAfterFold(); updateFloatCol(); }
  function foldPanel() {
    // narrow windows are always in panel mode: folding there just closes the sheet
    if (!canAnchor()) { panel.classList.add('collapsed'); saveCollapsed(); updateFloatCol(); return; }
    try { localStorage.setItem(FOLD_PREV_KEY, floatMode ? 'float' : 'panel'); } catch { /* private mode */ }
    if (!floatMode) { setStoredFloat(true); applyMode(); }
    panel.classList.add('collapsed'); saveCollapsed(); updateFloatCol();
  }
  function togglePanel() { if (panel.classList.contains('collapsed')) openPanel(); else foldPanel(); }
  $('#panelToggle').addEventListener('click', togglePanel);
  $('#panelClose').addEventListener('click', foldPanel);
  // in floating mode the collapsed panel is a thin strip; a click on it opens the panel
  panel.addEventListener('click', (e) => { if (floatMode && panel.classList.contains('collapsed') && !e.target.closest('button')) openPanel(); });
  // The template starts collapsed; the stored choice (or the size default) decides before the first
  // paint, and the shared prefs.json value wins when it arrives, unless the user already clicked.
  applyCollapsed(readJson(COLLAPSE_KEY, null));
  const prefsLoad = prefsApi(); // one GET per load, read here and by the section defaults
  prefsLoad.then((p) => {
    if (!p || typeof p.panelCollapsed !== 'boolean' || panelTouched) return;
    writeJson(COLLAPSE_KEY, p.panelCollapsed);
    applyCollapsed(p.panelCollapsed); updateFloatCol();
  }).catch(() => { /* server down */ });

  // floating panel: drag by header, resize via CSS `resize`, remember geometry per plan
  const GEO_KEY = `markup:panel:${P.dir}`;
  function applyGeo(g) {
    if (!g) return;
    panel.style.left = `${Math.max(0, Math.min(g.left, window.innerWidth - 120))}px`;
    panel.style.top = `${Math.max(0, Math.min(g.top, window.innerHeight - 80))}px`;
    panel.style.right = 'auto';
    if (g.width) panel.style.width = `${g.width}px`;
    if (g.height) panel.style.height = `${g.height}px`;
  }
  function saveGeo() {
    const r = panel.getBoundingClientRect();
    try { localStorage.setItem(GEO_KEY, JSON.stringify({ left: r.left, top: r.top, width: r.width, height: r.height })); } catch { /* private mode */ }
  }
  try { applyGeo(JSON.parse(localStorage.getItem(GEO_KEY))); } catch { /* ignore */ }
  const head = $('.panel-head', panel);
  head.addEventListener('pointerdown', (e) => {
    if (floatMode || e.target.closest('button')) return; // docked while floating: no drag
    const r = panel.getBoundingClientRect();
    const dx = e.clientX - r.left, dy = e.clientY - r.top;
    panel.classList.add('dragging');
    try { head.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    const move = (ev) => { applyGeo({ left: ev.clientX - dx, top: ev.clientY - dy }); };
    const up = () => { head.removeEventListener('pointermove', move); panel.classList.remove('dragging'); saveGeo(); };
    head.addEventListener('pointermove', move);
    head.addEventListener('pointerup', up, { once: true });
    head.addEventListener('pointercancel', up, { once: true });
  });
  new ResizeObserver(() => { if (!floatMode && !panel.classList.contains('collapsed') && !panel.classList.contains('dragging')) { saveGeo(); updateFloatCol(); } }).observe(panel);

  function focusThread(id) {
    const card = $(`.thread[data-id="${id}"]`, threadsEl);
    if (!card) { const t = byId(id); if (!t) return; filter = t.status; renderPanel(); return focusThread(id); }
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    flash(card);
  }
  function jumpTo(id) {
    const r = resolved.get(id);
    const el = r?.el || content;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    flash(el);
  }
  // An agent message may point at a page section with [[#id]] or [[#id|label]].
  // Rendered as a link that scrolls to that heading and flashes it.
  const SEC_RE = /\[\[#([A-Za-z0-9_-]+)(?:\|([^\]]+))?\]\]/g;
  const linkifySections = (escaped) => escaped.replace(SEC_RE, (m, id, label) => {
    const h = document.getElementById(id);
    if (!h) return label || '#' + id;
    return `<a class="sec-link" data-sec="${id}">${esc(label || textOf(h))}</a>`;
  });
  // Agents write markdown by habit. An agent message renders the small part of it that reads badly
  // as raw text: `code`, **bold**, [label](https://…) links and "- " bullets (review 29/09). Input is
  // already escaped; code spans are cut out first so nothing inside them is touched.
  const mdLite = (escaped) => escaped.split(/(`[^`\n]+`)/).map((part, i) => {
    if (i % 2) return `<code>${part.slice(1, -1)}</code>`;
    return part
      .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
      .replace(/(^|\n)[-*] /g, '$1• ');
  }).join('');
  const COLLAPSE_THREADS_KEY = `markup:threads-collapsed:${P.dir}`;
  let collapsedThreads = new Set(readJson(COLLAPSE_THREADS_KEY, []));
  const writeCollapsed = (set) => writeJson(COLLAPSE_THREADS_KEY, [...set]);
  const threadTitle = (t) => t.title || norm((t.messages || [])[0]?.text || '').slice(0, 60) || T.untitled;
  // delete is a trash can, not an "x": an x reads as "close", and closing is a status
  const TRASH = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>';

  const matchesFilter = (t) => filter === 'all' || (filter === 'active' ? t.status !== 'closed' : t.status === filter);
  const statusLabel = (s) => ({ open: T.statusOpen, waiting: T.statusWaiting, closed: T.statusClosed }[s] || s);
  const statusBadge = (s) => ({ open: 'warn', waiting: 'info', closed: 'muted' }[s] || 'muted');

  // One thread card. The same markup serves the side panel and the floating mode;
  // floating cards get a "−" (hide) button next to the fold chevron.
  // One renderer for thread cards and for the draft card (the compose box, status "draft"): the
  // draft has the same header, no messages, and the compose body instead of reply and status.
  function threadHtml(t, float) {
    const draft = Boolean(t.draft);
    const r = draft ? null : resolved.get(t.id);
    const block = t.anchor?.chain?.[0];
    const issue = t.kind === 'issue';
    const general = issue && !block && !t.anchor?.section; // a report from the TOC: not about a place on the page
    let where;
    if (general) where = draft ? '' : `<span>${esc(T.reportGeneral)}</span>`; // a draft says it under its heading (types, below)
    else if (draft) where = `<span id="composeWhere">${esc(t.anchor?.section || T.top)}${block ? ` › ${describeLink(block)}` : ''}</span>`;
    else if (!r) where = `<span class="orphan">${esc(T.orphan)}</span>${block ? `<br>${T.origin}: ${describeLink(block)}` : ''}`;
    else if (r.level > 0) where = `<a class="jump" data-jump="${t.id}">${esc(t.anchor?.section || T.top)}</a> · <span class="lvl">${T.anchoredTo}: ${describeLink({ ...r.link, text: textOf(r.el) }) || esc(T.top)}</span><br>${T.origin}: ${describeLink(block)}`;
    else where = `<a class="jump" data-jump="${t.id}">${esc(t.anchor?.section || T.top)}${block ? ` › ${describeLink(block)}` : ''}</a>`;
    const msgs = draft ? '' : (t.messages || []).map((m, i) => `<div class="msg ${m.role}" data-i="${i}"><span class="who">${m.role === 'agent' ? T.agent : T.you} · ${fmtIso(m.at)}${m.editedAt ? ` · ${T.edited}` : ''}${m.role === 'user' ? ` <a class="edit-msg" data-edit="${i}">${T.edit}</a>` : ''}</span><span class="txt"${editDraft(t.id, i) !== null ? ' hidden' : ''}>${m.role === 'agent' ? linkifySections(mdLite(esc(m.text))) : esc(m.text)}</span>${editDraft(t.id, i) !== null ? editBox(editDraft(t.id, i)) : ''}${msgAttachments(m)}</div>`).join('');
    const isCollapsed = collapsedThreads.has(t.id);
    // a report to markup: the type chips above the box, the note on what happens next below it, and
    // the agent-free way out (GitHub's own form, prefilled) next to the buttons
    const itype = ISSUE_TYPE_KEYS.includes(t.issueType) ? t.issueType : 'bug';
    const types = issue ? `<div class="issue-types" role="radiogroup" aria-label="${esc(T.reportType)}"><span class="issue-types-label">${esc(T.reportTitle)}${general ? `<span class="issue-types-sub">${esc(T.reportGeneral)}</span>` : ''}</span>${ISSUE_TYPE_KEYS.map((k) => `<button type="button" role="radio" aria-checked="${k === itype}" data-itype="${k}">${esc(T[`t_${k}`])}</button>`).join('')}</div>` : '';
    const body = draft
      ? `${types}<textarea id="composeText" rows="4" placeholder="${esc(issue ? T.reportHere : T.writeHere)}">${esc(t.text || '')}</textarea><div class="att-list" id="composeAtt"${(t.files || []).length ? '' : ' hidden'}>${attChips(t.files)}</div><div class="compose-actions"><button type="button" class="btn primary" data-act="send">${T.send}</button><button type="button" class="btn" data-act="cancel">${T.cancel}</button><button type="button" class="btn att-btn" data-act="attach" title="${esc(T.attach)}">&#128206;</button><input type="file" id="composeFile" multiple hidden>${issue ? `<a class="gh-direct" data-act="ghlink" href="https://github.com/${esc(P.repo)}/issues/new" target="_blank" rel="noopener" title="${esc(T.reportGhTitle)}">${esc(T.reportGh)}</a>` : '<span class="hint">Ctrl+Enter</span>'}</div>${issue ? `<p class="issue-note">${esc(T.reportNote)}</p>` : ''}`
      : `${msgs}
      <div class="thread-actions">
        <button type="button" class="btn" data-act="reply">${T.reply}</button>
        <button type="button" class="status-chip current ${statusBadge(t.status)}" data-statusdd title="${esc(T.statusTitle)}">${statusLabel(t.status)}<span class="caret">▾</span></button>
      </div>
      <div class="reply-box"${replyDraft(t.id) || (replyFiles.get(t.id) || []).length ? '' : ' hidden'}><textarea rows="3" placeholder="${esc(T.writeReply)}">${esc(replyDraft(t.id))}</textarea><div class="att-list" data-att="${t.id}"${(replyFiles.get(t.id) || []).length ? '' : ' hidden'}>${attChips(replyFiles.get(t.id))}</div><div class="compose-actions"><button type="button" class="btn primary small" data-act="sendReply">${T.send}</button><button type="button" class="btn small att-btn" data-act="attach" title="${esc(T.attach)}">&#128206;</button><input type="file" multiple hidden data-file="${t.id}"><span class="hint">Ctrl+Enter</span></div></div>`;
    return `<div class="thread ${draft ? 'draft' : t.status}${isCollapsed ? ' collapsed' : ''}${float ? ' float' : ''}" data-id="${t.id}">
      <div class="thread-head">
        ${draft ? `<span class="n draft">+</span>` : `<button type="button" class="n ${t.status}" data-act="jump" title="${esc(T.jump)}">#${t.n}</button>`}
        ${float ? `<button type="button" class="collapse-btn min-btn" data-act="min" title="${esc(T.minimize)}">−</button><button type="button" class="collapse-btn max-btn" data-act="max" title="${esc(maxedIds.has(t.id) ? T.restore : T.maximize)}">${maxedIds.has(t.id) ? '❐' : '▢'}</button>` : ''}
        <button type="button" class="collapse-btn" data-act="collapse" title="${isCollapsed ? T.expand : T.collapse}">${isCollapsed ? '▸' : '▾'}</button>
        ${issue ? `<span class="gh-issue kind-issue" title="${esc(T.reportKind)}" aria-label="${esc(T.reportKind)}"></span>` : ''}
        <span class="thread-title">${esc(draft ? (issue ? T.reportTitle : T.newComment) : threadTitle(t))}</span>
        ${t.issue?.url ? `<a class="issue-link" href="${esc(t.issue.url)}" target="_blank" rel="noopener" title="${esc(T.reportFiled)}">${t.issue.number ? `#${t.issue.number}` : 'GitHub'}</a>` : ''}
        <button type="button" class="btn small danger-ghost del-btn" data-act="del" title="${esc(draft ? T.draftDrop : T.del)}" aria-label="${esc(draft ? T.draftDrop : T.del)}">${TRASH}</button>
      </div>
      <div class="thread-body">
      <div class="where">${where}</div>
      ${t.anchor?.quote ? `<div class="quote">${esc(t.anchor.quote)}</div>` : ''}
      ${body}
      </div>
      ${float ? '<span class="rs-handle" aria-hidden="true"></span>' : ''}
    </div>`;
  }

  // a changed section from /state: by its h2 id, else by the heading text (a section without id)
  const sectionHeadOf = (c) => (c.id && content.contains(document.getElementById(c.id)) ? document.getElementById(c.id) : null) || $$('h2', content).find((x) => textOf(x) === c.heading);
  function renderPanel() {
    const counts = { active: 0, open: 0, waiting: 0, closed: 0, all: state.comments.length };
    state.comments.forEach((t) => { counts[t.status] = (counts[t.status] || 0) + 1; if (t.status !== 'closed') counts.active++; });
    filtersEl.innerHTML = ['active', 'open', 'waiting', 'closed', 'all'].map((f) => `<button type="button" data-f="${f}" class="${f === filter ? 'active' : ''}">${T[f]} ${counts[f] ? `(${counts[f]})` : ''}</button>`).join('');
    const oc = $('#openCount');
    oc.hidden = !counts.active; oc.textContent = counts.active;
    // blue when something waits for the user (the same blue as "waiting for me"), amber when only the agent owes answers
    oc.classList.toggle('mine', Boolean(counts.waiting));
    $('#panelToggle').title = counts.active ? T.countTitle(counts.waiting || 0, counts.open || 0) : '';

    // Oldest first: the reader works through them in the order they were raised.
    const list = state.comments.filter(matchesFilter).sort((a, b) => (a.n || 0) - (b.n || 0));
    if (floatMode) {
      // compact summary grouped by status: each section folds, and can show or hide all of its
      // floating cards at once (the same as pressing "−" on each). The filter is not used here.
      const all = state.comments.slice().sort((a, b) => (a.n || 0) - (b.n || 0));
      const row = (t) => `<div class="mini ${t.status}${cardVisible(t) ? '' : ' min'}" data-id="${t.id}">
        <span class="n">#${t.n}</span>
        <a class="mini-title" data-show="${t.id}" title="${esc(statusLabel(t.status))}">${esc(threadTitle(t))}</a>
        ${cardVisible(t) ? '' : `<span class="badge muted">${T.hidden}</span>`}
      </div>`;
      // unsent text first: a compose draft (with its anchor) and reply drafts per thread; clicking
      // one reopens the box where it was typed
      const draftRows = [];
      if (drafts.compose) draftRows.push(`<div class="mini draft"><span class="n">+</span><a class="mini-title" data-draftopen="compose" title="${esc(drafts.compose.anchor?.section || T.top)}">${esc(drafts.compose.kind === 'issue' ? T.reportDraft : T.draftNew)}: ${esc(drafts.compose.text.trim().slice(0, 50))}</a></div>`);
      Object.entries(drafts.replies || {}).forEach(([id, text]) => {
        const t = byId(id); if (!t || !String(text).trim()) return;
        draftRows.push(`<div class="mini draft"><span class="n">#${t.n}</span><a class="mini-title" data-draftopen="${t.id}" title="${esc(threadTitle(t))}">${esc(threadTitle(t))}: ${esc(String(text).trim().slice(0, 50))}</a></div>`);
      });
      const draftsFolded = foldedSections.has('drafts');
      // the section exists only while there is something in it
      const draftsSec = !draftRows.length ? '' : `<section class="sec drafts${draftsFolded ? ' folded' : ''}" data-sec="drafts">
          <div class="sec-head">
            <button type="button" class="collapse-btn" data-secfold="drafts" title="${draftsFolded ? T.expand : T.collapse}">${draftsFolded ? '▸' : '▾'}</button>
            <span class="dot"></span><strong>${esc(T.drafts)}</strong>
            <span class="cnt">${draftRows.length}</span>
          </div>
          <div class="sec-body">${draftRows.join('') || `<div class="mini-hint">${esc(T.noDrafts)}</div>`}</div>
        </section>`;
      // no comments at all: say how to make one, not three empty sections
      if (!all.length && !draftRows.length) { threadsEl.innerHTML = `<div class="empty-threads">${esc(T.noThreads)}</div>`; return renderChanges(); }
      // "waiting for me" first: that is the user's to-do list; then what the agent still owes; then closed
      threadsEl.innerHTML = draftsSec + [['waiting', T.statusWaiting], ['open', T.statusOpen], ['closed', T.closed]].map(([s, label]) => {
        const items = all.filter((t) => t.status === s);
        const shown = items.filter(cardVisible).length;
        const folded = foldedSections.has(s);
        const on = Boolean(secDefault[s]);
        // an empty section keeps its head (its eye is the default for cards that arrive later) but no
        // "No comments" line and no "0/0" (review 29/09); the count is "shown/all" only when they differ
        return `<section class="sec ${s}${folded ? ' folded' : ''}${items.length ? '' : ' empty'}" data-sec="${s}">
          <div class="sec-head">
            <button type="button" class="collapse-btn" data-secfold="${s}" title="${folded ? T.expand : T.collapse}">${folded ? '▸' : '▾'}</button>
            <span class="dot"></span><strong>${esc(label)}</strong>
            <button type="button" class="collapse-btn eye${on ? ' on' : ''}" data-secdef="${s}" title="${esc(on ? T.secShown : T.secHidden)}">${on ? EYE : EYE_OFF}</button>
            <span class="cnt" title="${esc(T.shown)}">${!items.length ? '' : shown === items.length ? items.length : `${shown}/${items.length}`}</span>
          </div>
          <div class="sec-body">
            ${items.map(row).join('')}
          </div>
        </section>`;
      }).join('') + `<div class="mini-hint">${esc(T.miniHint)}</div>`;
    } else if (!list.length) {
      threadsEl.innerHTML = `<div class="empty-threads">${state.comments.length ? '' : esc(T.noThreads)}</div>`;
    } else {
      threadsEl.innerHTML = list.map((t) => threadHtml(t, false)).join('');
    }
    renderChanges();
  }
  function renderChanges() {
    // changes box
    if (state.changed?.length && !P.readonly) {
      changesEl.hidden = false;
      changesEl.innerHTML = `<strong>${esc(T.changed)}</strong><ul>${state.changed.map((c) => {
        const h = sectionHeadOf(c);
        const label = c.heading || T.top;
        return `<li>${h ? `<a href="#${h.id}">${esc(label)}</a>` : esc(label)} <span class="badge ${c.kind === 'removed' ? 'danger' : c.kind === 'added' ? 'ok' : 'info'} upd">${T[c.kind === 'changed' ? 'updated' : c.kind]}</span></li>`;
      }).join('')}</ul><button type="button" class="btn small" id="seenBtn">${T.seen}</button>`;
      $$('.badge.upd', content).forEach((b) => b.remove());
      $$('a.upd-added, a.upd-changed', toc).forEach((a) => a.classList.remove('upd-added', 'upd-changed'));
      state.changed.forEach((c) => {
        const h = sectionHeadOf(c);
        if (h && c.kind !== 'removed') {
          const b = document.createElement('span'); b.className = `badge ${c.kind === 'added' ? 'ok' : 'info'} upd`; b.textContent = T[c.kind === 'changed' ? 'updated' : c.kind]; h.appendChild(b);
          // the same mark in the table of contents: green for a new section, blue for a changed one
          const a = $(`a[data-for="${h.id}"]`, toc); if (a) a.classList.add(c.kind === 'added' ? 'upd-added' : 'upd-changed');
        }
      });
    } else {
      changesEl.hidden = true; changesEl.innerHTML = '';
      $$('.badge.upd', content).forEach((b) => b.remove());
      $$('a.upd-added, a.upd-changed', toc).forEach((a) => a.classList.remove('upd-added', 'upd-changed'));
    }
  }

  // ---------- floating mode ----------
  let floatPos = readJson(FLOAT_POS_KEY, {});      // id -> {x, y} in document pixels; present = dragged by hand
  // Which cards float: open and waiting threads unless hidden ("−"); closed ones only when revealed.
  // Both sets are per plan, so a closed thread stays out of the way until asked for.
  const FLOAT_REV_KEY = `markup:float-revealed:${P.dir}`;
  const FLOAT_SEC_KEY = `markup:float-sections:${P.dir}`;
  // Each status section has a default, shown or hidden (the eye in its header), that applies to
  // a card when it is created or arrives in that status. "−" on a card, or a click on its row in
  // the list, overrides the default for that card until its status changes again. Flipping the
  // eye applies the new default to the whole section (overrides there are dropped).
  const SEC_DEF_KEY = 'markup:float-secdef', OVERRIDE_KEY = `markup:float-override:${P.dir}`, LAST_STATUS_KEY = `markup:float-laststatus:${P.dir}`;
  const SEC_DEFAULTS = { waiting: true, open: true, closed: false };
  let secDefault = { ...SEC_DEFAULTS, ...readJson(SEC_DEF_KEY, {}) }; // localStorage is the cache; the server's prefs.json (shared by every project) wins when it arrives (H#73)
  let override = readJson(OVERRIDE_KEY, null);
  let lastStatus = readJson(LAST_STATUS_KEY, {});
  if (!override) { // one-time migration from the older hidden / revealed sets
    override = {};
    readJson(FLOAT_MIN_KEY, []).forEach((id) => { override[id] = false; });
    readJson(FLOAT_REV_KEY, []).forEach((id) => { override[id] = true; });
  }
  let foldedSections = new Set(readJson(FLOAT_SEC_KEY, []));
  const cardVisible = (t) => (t.id in override ? Boolean(override[t.id]) : Boolean(secDefault[t.status]));
  function setVisible(t, on) { override[t.id] = Boolean(on); }
  const persistVisibility = () => { writeJson(OVERRIDE_KEY, override); writeJson(SEC_DEF_KEY, secDefault); prefsApi({ method: 'PUT', body: JSON.stringify({ secDefault }) }).catch(() => { /* server down: local only */ }); };
  prefsLoad.then((p) => { if (p && p.secDefault) { secDefault = { ...SEC_DEFAULTS, ...p.secDefault }; writeJson(SEC_DEF_KEY, secDefault); renderPanel(); } }).catch(() => { /* server down */ });
  // a card whose status changed drops its override, so the default of its new section applies
  function reconcileStatuses(list) {
    let changed = false;
    (list || []).forEach((t) => {
      if (lastStatus[t.id] === t.status) return;
      if (t.id in lastStatus && t.id in override) { delete override[t.id]; changed = true; }
      lastStatus[t.id] = t.status;
    });
    writeJson(LAST_STATUS_KEY, lastStatus);
    if (changed) persistVisibility();
  }
  const EYE = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const EYE_OFF = '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/><path d="M3 3l18 18"/></svg>';
  const modeSeg = $('#modeSeg'); // "מעוגן | פאנל" pair in the panel head (H#53)
  const topFilters = $('#topFilters');
  const CARD_W = 340, GAP = 12;
  // a card's header sits CARD_DROP below its #n badge: level with it, the connector ran flat along the
  // text line and read as strikethrough, and the card hid the end of the commented line (user, 29/09)
  const CARD_DROP = 32;
  // Stacking among floating cards: the most recently pressed is on top of the others, but every
  // ordinary card stays under the lines layer (z 20); only the focused card rises above it (CSS).
  let zOrder = [];
  const Z_BASE = 6, Z_MAX = 19;
  function applyZ() {
    $$('.float', floatsEl).forEach((c, i) => {
      const k = zOrder.indexOf(c.dataset.id);
      c.style.zIndex = String(Math.min(Z_MAX, Z_BASE + (k < 0 ? Math.min(i, 3) : k)));
    });
  }
  // maximize: 80% of the content area (10% margin all round), toggled from the card header;
  // the previous geometry comes back on the second click. Session-only, never persisted.
  const maxedIds = new Set();
  const maxedPrev = new Map();
  function toggleMax(card) {
    const id = card.dataset.id;
    if (maxedIds.has(id)) {
      const prev = maxedPrev.get(id) || {};
      maxedIds.delete(id); maxedPrev.delete(id);
      card.classList.remove('maxed');
      if (prev.size) floatSize[id] = prev.size; else delete floatSize[id];
      if (prev.pos) floatPos[id] = prev.pos; else delete floatPos[id];
      card.style.width = ''; card.style.height = ''; applySize(card);
      layoutFloats();
      return;
    }
    maxedPrev.set(id, { size: floatSize[id], pos: floatPos[id] });
    const cr = content.getBoundingClientRect();
    const topH = $('.top')?.offsetHeight || 0;
    const areaX = cr.left + window.scrollX, areaW = cr.width;
    const areaY = window.scrollY + topH, areaH = window.innerHeight - topH;
    const w = Math.round(areaW * 0.8), h = Math.round(areaH * 0.8);
    floatSize[id] = { w, h };
    const ab = anchorBox(byId(id) || { id });
    floatPos[id] = { dx: Math.round(areaX + areaW * 0.1) - ab.x, dy: Math.round(areaY + areaH * 0.1) - ab.y };
    maxedIds.add(id);
    card.classList.add('maxed');
    applySize(card);
    focusFloat(card);
    layoutFloats();
  }
  const LINE_COLOR = { open: '#f59e0b', waiting: '#3b82f6', closed: '#9ca3af', draft: '#8b5cf6' };

  // While floating, the panel is docked on the inline-end side (left in RTL) as a fixed column, or
  // a thin strip when collapsed, and the content keeps clear of it. Panel mode keeps the open
  // panel's column free the same way.
  // Cards get no column of their own (user, 29/09): the text takes the whole free width, cards
  // float over it next to their anchors, and a card that covers something is the user's to fold
  // (▾), hide (−) or shrink (corner handle). A reserved cards column narrowed the text on every
  // page with a comment and was reverted.
  function updateFloatCol() {
    const vw = document.documentElement.clientWidth;
    const body = document.body.style;
    const topEl = $('.top');
    const topFixed = topEl ? getComputedStyle(topEl).position !== 'static' : true; // on phones it scrolls away: nothing to leave room for
    document.documentElement.style.setProperty('--top-h', `${topFixed ? topEl?.offsetHeight || 56 : 0}px`); // the top bar wraps on narrow windows
    if (!floatMode) {
      body.removeProperty('--float-col');
      const open = !panel.classList.contains('collapsed');
      const pw = open ? panel.getBoundingClientRect().width + 2 * GAP : 0;
      body.setProperty('--panel-col', `${open && !isNarrow() && vw - pw >= 500 ? pw : 16}px`); // a half-screen window keeps a 500px text column beside the panel
      return;
    }
    body.removeProperty('--panel-col');
    body.setProperty('--float-col', `${panel.offsetWidth + GAP}px`);
    scheduleLayout();
  }
  window.addEventListener('resize', () => {
    const want = storedFloat && canAnchor();
    if (want !== floatMode) { floatMode = want; applyMode(); } else updateFloatCol();
  });
  function applyMode() {
    document.body.classList.toggle('float-mode', floatMode);
    document.body.classList.toggle('narrow', isNarrow());
    document.body.classList.toggle('no-anchor', !canAnchor()); // the mode pair hides: anchored does not fit
    $('#panelClose').title = T.foldTitle;
    $$('button', modeSeg).forEach((b) => { const isFloat = b.dataset.mode === 'float'; b.classList.toggle('active', isFloat === floatMode); b.textContent = isFloat ? T.modeFloat : T.modePanel; b.title = isFloat ? T.modeFloatTitle : T.modePanelTitle; });
    // while floating the status filters are replaced by the sectioned side list (CSS hides them)
    // docked panel ignores the remembered free-floating geometry; restore it when leaving the mode
    if (floatMode) panel.style.cssText = ''; else { try { applyGeo(JSON.parse(localStorage.getItem(GEO_KEY))); } catch { /* ignore */ } }
    updateFloatCol();
    renderPanel(); renderFloats();
  }
  modeSeg.addEventListener('click', (e) => { const b = e.target.closest('button[data-mode]'); if (!b) return; const want = b.dataset.mode === 'float'; if (want === floatMode) return; setStoredFloat(want); applyMode(); });

  // Card size: compact by default (natural height up to DEFAULT_H, then an inner scroll), and
  // resizable from the bottom corner to any size — no maximum. A user-set size is remembered per
  // thread. The handle is ours, not CSS `resize`: in RTL the native one grows the wrong way.
  const FLOAT_SIZE_KEY = `markup:float-size:${P.dir}`;
  const DEFAULT_H = 340, MIN_W = 240, MIN_H = 72;
  let floatSize = readJson(FLOAT_SIZE_KEY, {});
  function applySize(card) {
    const s = floatSize[card.dataset.id];
    if (s) { card.style.width = `${s.w}px`; card.style.height = `${s.h}px`; return; }
    if (card.offsetHeight > DEFAULT_H) card.style.height = `${DEFAULT_H}px`;
  }
  function renderFloats() {
    if (!floatMode) { floatsEl.innerHTML = ''; linesEl.innerHTML = ''; linesTopEl.innerHTML = '';return; }
    const list = state.comments.filter(cardVisible).sort((a, b) => (a.n || 0) - (b.n || 0));
    // A card is capped in height and re-rendered on every poll that changed something: keep each
    // card's scroll, and bring the newest message into view when one arrives (and on the first
    // render of an answered card), so the answer is what the card shows (review 29/09).
    const prev = new Map($$('.float', floatsEl).map((c) => [c.dataset.id, { top: $('.thread-body', c)?.scrollTop || 0, n: $$('.msg', c).length }]));
    floatsEl.innerHTML = list.map((t) => threadHtml(t, true)).join('');
    $$('.float', floatsEl).forEach((c) => {
      applySize(c); if (maxedIds.has(c.dataset.id)) c.classList.add('maxed');
      const body = $('.thread-body', c), msgs = $$('.msg', c), p = prev.get(c.dataset.id), t = byId(c.dataset.id);
      if (!body) return;
      const last = msgs[msgs.length - 1];
      const toLast = last && (p ? msgs.length > p.n : t?.status === 'waiting');
      if (toLast) body.scrollTop += last.getBoundingClientRect().top - body.getBoundingClientRect().top - 8;
      else if (p) body.scrollTop = p.top;
    });
    layoutFloats();
  }
  floatsEl.addEventListener('pointerdown', (e) => {
    const hd = e.target.closest('.rs-handle');
    if (!hd) return;
    e.preventDefault(); e.stopPropagation();
    const card = hd.closest('.float'); const id = card.dataset.id;
    const w0 = card.offsetWidth, h0 = card.offsetHeight;
    const dx0 = floatPos[id] && 'dx' in floatPos[id] ? floatPos[id].dx : null;
    const sx = e.clientX, sy = e.clientY;
    let w = w0, h = h0;
    try { hd.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    card.classList.add('resizing');
    const move = (ev) => {
      // the handle sits on the inline-end corner: in RTL pulling it left makes the card wider,
      // and the card grows leftwards so its right edge (the side facing the anchor) stays put
      const dw = isRtl ? sx - ev.clientX : ev.clientX - sx;
      w = Math.max(MIN_W, w0 + dw); h = Math.max(MIN_H, h0 + (ev.clientY - sy));
      card.style.width = `${w}px`; card.style.height = `${h}px`;
      if (isRtl && dx0 !== null) floatPos[id].dx = dx0 - (w - w0);
      layoutFloats();
    };
    const up = () => {
      hd.removeEventListener('pointermove', move); card.classList.remove('resizing');
      floatSize[id] = { w, h }; writeJson(FLOAT_SIZE_KEY, floatSize);
      if (floatPos[id]) writeJson(FLOAT_POS_KEY, floatPos);
    };
    hd.addEventListener('pointermove', move);
    hd.addEventListener('pointerup', up, { once: true });
    hd.addEventListener('pointercancel', up, { once: true });
  });
  // Where the line lands on the page: the thread's number badge (#n) on the anchored block, so the
  // line always joins number to number. Falls back to the block itself when the badge is missing.
  // Two boxes per thread: the #n badge (where the line lands) and the anchored block itself (what
  // the card must keep clear of). Both in document pixels.
  function anchorBox(t) {
    const box = (el) => { const b = el.getBoundingClientRect(); return { x: b.left + window.scrollX, y: b.top + window.scrollY, w: b.width, h: b.height }; };
    const badge = $(`.c-badge[data-id="${t.id}"]`, content);
    const r = resolved.get(t.id);
    // placement keeps clear of the whole anchored block (a highlighted quote is only part of it)
    const blockEl = r?.el || content;
    const target = badge || marks.get(t.id) || blockEl;
    return { ...box(target), badge: !!badge, block: box(blockEl) };
  }
  // Auto placement: the free column on the inline-end side of the content, each card just below
  // its anchor, pushed down just enough not to overlap the previous card. Hand-dragged cards stay
  // where they were put. Lines are redrawn from the final positions.
  function layoutFloats() {
    if (!floatMode) return;
    const cards = $$('.float', floatsEl);
    if (!cards.length) { drawLines([]); return; }
    const docW = document.documentElement.scrollWidth;
    // the docked panel owns the outer strip; cards may never sit over it, dragged ones included
    const sideW = panel.offsetWidth + GAP;
    const minX = isRtl ? sideW : 8, maxX = isRtl ? docW - 8 : docW - sideW; // limits for the card's left/right edges
    const items = cards.map((c) => { const t = byId(c.dataset.id); return t ? { c, t, a: anchorBox(t), pos: floatPos[t.id] } : null; }).filter(Boolean);
    items.sort((p, q) => p.a.y - q.a.y || (p.t.n || 0) - (q.t.n || 0));
    // A card floats over the content in its anchor's area: header CARD_DROP below the #n badge, and a
    // short distance past the far edge of the anchored block along the reading direction, so the
    // anchored text itself stays readable with the card a little further on. Staying in that area
    // matters more than not overlapping: a card may slide down at most MAX_SHIFT to clear the
    // previous one; past that it overlaps, stepped down one header height so every title remains
    // visible, later cards on top.
    const DIST = 48, MAX_SHIFT = 140, CASCADE = 36;
    let prevTop = -Infinity, prevBottom = 0;
    items.forEach((it, i) => {
      const cw = it.c.offsetWidth;
      if (it.pos) {
        // A hand-dragged card remembers its offset from its anchor, not a page coordinate: when a
        // new version adds sections above, the anchor moves and the card moves with it. Older
        // entries stored page coordinates; they are converted once, and dropped when they were
        // already far from the anchor (that was the bug being fixed).
        if (!('dx' in it.pos)) {
          const dx = it.pos.x - it.a.x, dy = it.pos.y - it.a.y;
          if (Math.abs(dy) > window.innerHeight * 2 || Math.abs(dx) > 1600) { delete floatPos[it.t.id]; it.pos = null; }
          else { it.pos = floatPos[it.t.id] = { dx, dy }; }
          writeJson(FLOAT_POS_KEY, floatPos);
        }
      }
      if (it.pos) {
        const reach = window.innerHeight; // a card may sit up to one viewport height from its anchor, either way
        const dy = Math.max(-reach, Math.min(reach, it.pos.dy));
        it.x = Math.max(minX, Math.min(it.a.x + it.pos.dx, maxX - cw)); it.y = Math.max(0, it.a.y + dy);
      } else {
        const want = Math.max(0, it.a.y + it.a.h / 2 - 18 + CARD_DROP); // header row CARD_DROP below the badge
        let y = Math.max(want, prevBottom);
        if (y > want + MAX_SHIFT) y = Math.min(want + MAX_SHIFT, Math.max(want, prevTop + CASCADE));
        it.y = y;
        const bk = it.a.block;
        const x = isRtl ? bk.x - DIST - cw : bk.x + bk.w + DIST;
        it.x = Math.max(minX, Math.min(x, maxX - cw));
        prevTop = y;
        prevBottom = Math.max(prevBottom, y + it.c.offsetHeight + GAP);
      }
      it.c.style.left = `${it.x}px`; it.c.style.top = `${it.y}px`;
    });
    applyZ();
    drawLines(items);
  }
  // A connector starts at the card's edge facing the anchor, level with its #n, so it never runs
  // across the card's own title; a card that sits over its anchor keeps the #n as the start.
  function edgeStart(cardEl, nEl, ax) {
    const cr = cardEl.getBoundingClientRect(); const nb = nEl ? nEl.getBoundingClientRect() : null;
    const L = cr.left + window.scrollX, R = cr.right + window.scrollX;
    const cy = nb ? nb.top + nb.height / 2 + window.scrollY : cr.top + window.scrollY + 18;
    const cx = ax < L ? L : ax > R ? R : nb ? nb.left + nb.width / 2 + window.scrollX : (L + R) / 2;
    return { cx, cy };
  }
  function drawLines(items) {
    const W = document.documentElement.scrollWidth, H = document.documentElement.scrollHeight;
    // Two layers: ordinary connectors sit above ordinary cards and below the focused card, so no
    // foreign line crosses the card being read; the focused card's own connector goes on the top
    // layer so it stays visible over that card.
    [linesEl, linesTopEl].forEach((el) => { el.setAttribute('width', W); el.setAttribute('height', H); el.style.width = `${W}px`; el.style.height = `${H}px`; });
    const lineFor = (it) => {
      // one straight segment, number to number: from the centre of the #n in the card header
      // (sticky, so it is right even when the card is scrolled) to the centre of the #n badge on
      // the page. The lines layer sits above the cards, so the end is never hidden by a border.
      const ax = it.a.x + it.a.w / 2;
      const { cx, cy } = edgeStart(it.c, $('.thread-head .n', it.c), ax);
      const ay = it.a.badge ? it.a.y + it.a.h / 2 : it.a.y + Math.min(12, it.a.h / 2);
      const col = LINE_COLOR[it.t.status] || LINE_COLOR.closed;
      return `<line x1="${cx}" y1="${cy}" x2="${ax}" y2="${ay}" stroke="${col}" stroke-width="1"/>${it.a.badge ? '' : `<circle cx="${ax}" cy="${ay}" r="2.5" fill="${col}"/>`}`;
    };
    const isFocused = (it) => it.c.classList.contains('focused');
    linesEl.innerHTML = items.filter((it) => !isFocused(it)).map(lineFor).join('');
    linesTopEl.innerHTML = items.filter(isFocused).map(lineFor).join('') + composeLine();
  }
  // The new-comment box, while it is open in floating mode, is a card like the others: its own
  // connector runs from the "+" in its header to the selected text (or the block it was opened on).
  function composeLine() {
    if (compose.hidden || !compose.classList.contains('float-compose') || !pending?.rect) return '';
    const nEl = $('.thread-head .n', compose); if (!nEl) return '';
    composeAnchor(); // live: the text under it may have reflowed since the box opened
    // it lands where a saved card's #n will sit: the end of the selection, else the block's corner,
    // never in the middle of the words (a line through them reads as strikethrough)
    const r = pending.end || pending.rect;
    const ax = pending.end ? r.x : isRtl ? r.x : r.x + r.w, ay = pending.end ? r.y : r.y + Math.min(12, r.h / 2);
    // a box that opened right against the words needs no line; one from its "+" ran down through the
    // box itself when it opened above them (29/09). Dragged away, the line comes back.
    const w = pending.endLine || pending.rect, b = compose.getBoundingClientRect();
    const bt = b.top + window.scrollY, bb = b.bottom + window.scrollY, bl = b.left + window.scrollX, br = b.right + window.scrollX;
    if (Math.max(bt - (w.y + w.h), w.y - bb) <= 24 && bl < w.x + w.w && br > w.x) return '';
    const { cx, cy } = edgeStart($('.thread', compose) || compose, nEl, ax);
    const col = LINE_COLOR.draft;
    return `<line x1="${cx}" y1="${cy}" x2="${ax}" y2="${ay}" stroke="${col}" stroke-width="1"/><circle cx="${ax}" cy="${ay}" r="2.5" fill="${col}"/>`;
  }
  function scheduleLayout() { if (!floatMode) return; clearTimeout(layoutTimer); layoutTimer = setTimeout(layoutFloats, 60); }
  window.addEventListener('resize', scheduleLayout);
  new ResizeObserver(scheduleLayout).observe(content);

  function showFloat(id) {
    const t = byId(id);
    if (!t) return;
    if (!cardVisible(t)) { setVisible(t, true); persistVisibility(); renderPanel(); renderFloats(); }
    const card = $(`.float[data-id="${id}"]`, floatsEl);
    if (!card) return;
    focusFloat(card);
    card.scrollIntoView({ block: 'center', behavior: 'smooth' });
    flash(card);
  }
  // any press on a card brings it above its neighbours (overlap is allowed near a shared anchor)
  // and makes it the focused card: fully opaque, whatever its status
  function focusFloat(card) {
    $$('.float.focused', floatsEl).forEach((c) => { if (c !== card) c.classList.remove('focused'); });
    card.classList.add('focused');
    zOrder = zOrder.filter((x) => x !== card.dataset.id); zOrder.push(card.dataset.id);
    applyZ();
    scheduleLayout(); // moves this card's connector to the top lines layer
  }
  floatsEl.addEventListener('pointerdown', (e) => { const card = e.target.closest('.float'); if (card) focusFloat(card); }, true);
  // drag a card by its header; double-click the header snaps it back to the automatic spot
  floatsEl.addEventListener('pointerdown', (e) => {
    const hd = e.target.closest('.thread-head');
    if (!hd || e.target.closest('button, select, a, textarea')) return;
    const card = hd.closest('.float');
    const sx = e.clientX, sy = e.clientY, ox = parseFloat(card.style.left) || 0, oy = parseFloat(card.style.top) || 0;
    const t0 = byId(card.dataset.id); if (!t0) return;
    const a0 = anchorBox(t0); // the remembered position is an offset from the anchor
    let moved = false;
    try { hd.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    const move = (ev) => {
      const nx = ox + ev.clientX - sx, ny = oy + ev.clientY - sy;
      if (!moved && Math.abs(nx - ox) + Math.abs(ny - oy) < 3) return;
      moved = true; card.classList.add('dragging');
      floatPos[card.dataset.id] = { dx: nx - a0.x, dy: ny - a0.y };
      layoutFloats();
    };
    const up = () => { hd.removeEventListener('pointermove', move); card.classList.remove('dragging'); if (moved) writeJson(FLOAT_POS_KEY, floatPos); };
    hd.addEventListener('pointermove', move);
    hd.addEventListener('pointerup', up, { once: true });
    hd.addEventListener('pointercancel', up, { once: true });
  });
  floatsEl.addEventListener('dblclick', (e) => {
    const hd = e.target.closest('.thread-head');
    if (!hd || e.target.closest('button, select, a')) return;
    const card = hd.closest('.float'); const id = card.dataset.id;
    let changed = false;
    if (id in floatPos) { delete floatPos[id]; writeJson(FLOAT_POS_KEY, floatPos); changed = true; }
    if (id in floatSize) { delete floatSize[id]; writeJson(FLOAT_SIZE_KEY, floatSize); card.style.width = ''; card.style.height = ''; applySize(card); changed = true; }
    if (changed) layoutFloats();
  });

  // ---------- thread interactions (panel and floating cards share them) ----------
  // Thread cards are rebuilt from HTML on every change (a poll that brought an agent answer, a status
  // flip). The text of an open reply or edit survives through its draft; focus, caret and the box's
  // scroll are carried over here, so typing is not interrupted when another thread changes.
  function captureFocus() {
    const a = document.activeElement;
    if (!a?.matches?.('textarea') || !(threadsEl.contains(a) || floatsEl.contains(a))) return null;
    const th = a.closest('.thread'), msg = a.closest('.msg');
    const kind = a.closest('.reply-box') ? 'reply' : msg ? `edit:${msg.dataset.i}` : null;
    return kind && th ? { floats: floatsEl.contains(a), id: th.dataset.id, kind, s: a.selectionStart, e: a.selectionEnd, d: a.selectionDirection, top: a.scrollTop } : null;
  }
  function restoreFocus(f) {
    if (!f) return;
    const th = $(`.thread[data-id="${f.id}"]`, f.floats ? floatsEl : threadsEl); if (!th) return;
    const el = f.kind === 'reply' ? $('.reply-box textarea', th) : $(`.msg[data-i="${f.kind.slice(5)}"] textarea`, th);
    if (!el) return;
    const box = el.closest('.reply-box'); if (box) box.hidden = false; // opened but still empty: no draft kept it open
    el.focus({ preventScroll: true });
    try { el.setSelectionRange(f.s, f.e, f.d); } catch { /* detached */ }
    el.scrollTop = f.top;
  }
  function rerender() { const f = captureFocus(); renderPanel(); renderFloats(); restoreFocus(f); }
  filtersEl.addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; filter = b.dataset.f; rerender(); });
  changesEl.addEventListener('click', async (e) => { if (e.target.id === 'seenBtn') { await api('/seen', { method: 'POST' }); await poll(true); } });
  async function onThreadClick(e) {
    const show = e.target.closest('[data-show]');
    if (show) return showFloat(show.dataset.show);
    const dr = e.target.closest('[data-draftopen]');
    if (dr) {
      if (dr.dataset.draftopen === 'compose') return openComposeFromDraft();
      showFloat(dr.dataset.draftopen);
      const card = $(`.float[data-id="${dr.dataset.draftopen}"]`, floatsEl);
      const box = card && $('.reply-box', card); if (box) { box.hidden = false; $('textarea', box)?.focus(); scheduleLayout(); }
      return;
    }
    const fold = e.target.closest('[data-secfold]');
    if (fold) {
      const s = fold.dataset.secfold;
      if (foldedSections.has(s)) foldedSections.delete(s); else foldedSections.add(s);
      writeJson(FLOAT_SEC_KEY, [...foldedSections]);
      return renderPanel();
    }
    const def = e.target.closest('[data-secdef]');
    if (def) {
      const s = def.dataset.secdef;
      secDefault[s] = !secDefault[s];
      state.comments.filter((t) => t.status === s).forEach((t) => { delete override[t.id]; });
      persistVisibility();
      return rerender();
    }
    const sec = e.target.closest('[data-sec]');
    if (sec) {
      const el = document.getElementById(sec.dataset.sec);
      if (!el) return;
      el.scrollIntoView({ block: 'start', behavior: 'smooth' });
      flash(el);
      return;
    }
    const col = e.target.closest('[data-act="collapse"]');
    if (col) {
      const id = col.closest('.thread').dataset.id;
      if (collapsedThreads.has(id)) collapsedThreads.delete(id); else collapsedThreads.add(id);
      writeCollapsed(collapsedThreads);
      return rerender();
    }
    const mx = e.target.closest('[data-act="max"]');
    if (mx) { const card = mx.closest('.float'); if (card) { toggleMax(card); const b = $('[data-act="max"]', card); if (b) { b.textContent = maxedIds.has(card.dataset.id) ? '❐' : '▢'; b.title = maxedIds.has(card.dataset.id) ? T.restore : T.maximize; } } return; }
    const min = e.target.closest('[data-act="min"]');
    if (min) {
      const t = byId(min.closest('.thread').dataset.id);
      if (t) { setVisible(t, false); persistVisibility(); }
      return rerender();
    }
    const jump = e.target.closest('[data-jump]');
    if (jump) return jumpTo(jump.dataset.jump);
    const edit = e.target.closest('[data-edit]');
    if (edit) {
      const msg = edit.closest('.msg');
      const txt = $('.txt', msg);
      if ($('textarea', msg)) return;
      const id = msg.closest('.thread').dataset.id;
      const text = byId(id)?.messages?.[Number(msg.dataset.i)]?.text ?? txt.textContent;
      setEditDraft(id, msg.dataset.i, text); // open = drafted, so a re-render or a reload keeps the box open
      txt.hidden = true; txt.insertAdjacentHTML('afterend', editBox(text));
      const ta = $('textarea', msg); ta.focus(); ta.setSelectionRange(ta.value.length, ta.value.length); // edits usually add at the end
      scheduleLayout();
      return;
    }
    const editBtn = e.target.closest('[data-act="saveEdit"], [data-act="cancelEdit"]');
    if (editBtn) {
      const msg = editBtn.closest('.msg');
      const id = msg.closest('.thread').dataset.id;
      if (editBtn.dataset.act === 'saveEdit') {
        const text = $('textarea', msg).value.trim();
        if (text && !(await sendOnce(`edit:${id}:${msg.dataset.i}`, editBtn, () => api(`/comments/${id}/messages/${msg.dataset.i}`, { method: 'PATCH', body: JSON.stringify({ text }) })))) return;
      }
      setEditDraft(id, msg.dataset.i, null);
      return poll(true);
    }
    const dd = e.target.closest('[data-statusdd]');
    if (dd) {
      const t = byId(dd.closest('.thread').dataset.id);
      if (!statusMenu.hidden && statusMenu.dataset.id === t?.id) return hideStatusMenu();
      if (t) openStatusMenu(dd, t.id, t.status);
      return;
    }
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const card = btn.closest('.thread');
    const id = card.dataset.id;
    const act = btn.dataset.act;
    if (act === 'jump') return jumpTo(id);
    if (act === 'reply') { const box = $('.reply-box', card); box.hidden = !box.hidden; if (!box.hidden) $('textarea', box).focus(); scheduleLayout(); return; }
    if (act === 'attach') { $('input[type=file][data-file]', card).click(); return; }
    if (act === 'sendReply') {
      const ta = $('.reply-box textarea', card); const text = ta.value.trim();
      const attachments = replyFiles.get(id) || [];
      if (!text && !attachments.length) return;
      const sent = await sendOnce(`reply:${id}`, btn, () => api(`/comments/${id}/messages`, { method: 'POST', body: JSON.stringify({ role: 'user', text, attachments }) }), () => { replyFiles.delete(id); saveReplyFiles(id); setReplyDraft(id, ''); });
      await poll(true);
      // the new message is the last one: bring it into view inside its card (a compact card scrolls,
      // and it stayed at the top with the new message hidden below)
      if (sent) $$(`.thread[data-id="${CSS.escape(id)}"]`).forEach((c) => { const body = $('.thread-body', c); if (body && body.scrollHeight > body.clientHeight) body.scrollTop = body.scrollHeight; else $$('.msg', c).pop()?.scrollIntoView({ block: 'nearest' }); });
      return;
    }
    if (act === 'del') { if (!confirm(T.confirmDel)) return; await api(`/comments/${id}`, { method: 'DELETE' }); return poll(true); }
  }
  // Status dropdown: the current status is a chip; clicking it opens a small menu of chips (colored
  // backgrounds, not colored text). One fixed-position menu for the whole page, so it is never
  // clipped by a scrolling card.
  const statusMenu = document.createElement('div');
  statusMenu.className = 'status-menu'; statusMenu.hidden = true; statusMenu.setAttribute('role', 'listbox');
  document.body.appendChild(statusMenu);
  function hideStatusMenu() { statusMenu.hidden = true; statusMenu.dataset.id = ''; }
  function openStatusMenu(btn, id, current) {
    statusMenu.innerHTML = ['open', 'waiting', 'closed'].map((s) => `<button type="button" role="option" class="status-chip ${statusBadge(s)}${s === current ? ' selected' : ''}" data-setstatus="${s}" aria-selected="${s === current}">${statusLabel(s)}</button>`).join('');
    statusMenu.dataset.id = id; statusMenu.hidden = false;
    const r = btn.getBoundingClientRect();
    const mh = statusMenu.offsetHeight, mw = statusMenu.offsetWidth;
    const top = r.bottom + 4 + mh > window.innerHeight ? r.top - 4 - mh : r.bottom + 4;
    const left = isRtl ? r.left : r.right - mw;
    statusMenu.style.top = `${Math.max(8, top)}px`;
    statusMenu.style.left = `${Math.max(8, Math.min(left, window.innerWidth - mw - 8))}px`;
  }
  statusMenu.addEventListener('click', async (e) => {
    const opt = e.target.closest('[data-setstatus]');
    if (!opt) return;
    const id = statusMenu.dataset.id;
    hideStatusMenu();
    await api(`/comments/${id}`, { method: 'PATCH', body: JSON.stringify({ status: opt.dataset.setstatus }) });
    return poll(true);
  });
  document.addEventListener('mousedown', (e) => { if (!statusMenu.hidden && !statusMenu.contains(e.target) && !e.target.closest('[data-statusdd]')) hideStatusMenu(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideStatusMenu(); });
  window.addEventListener('scroll', hideStatusMenu, { passive: true });
  function onThreadKey(e) {
    if (e.key !== 'Enter' || !e.ctrlKey) return;
    // Ctrl+Enter submits wherever the user is typing: a new reply or an edit in place.
    if (e.target.matches('.reply-box textarea')) { e.preventDefault(); $('[data-act="sendReply"]', e.target.closest('.reply-box')).click(); return; }
    if (e.target.matches('.msg textarea')) { e.preventDefault(); $('[data-act="saveEdit"]', e.target.closest('.msg')).click(); }
  }
  for (const el of [threadsEl, floatsEl]) {
    el.addEventListener('click', onThreadClick);
    el.addEventListener('keydown', onThreadKey);
  }
  // a growing reply box or edit box moves the cards below it
  floatsEl.addEventListener('input', scheduleLayout);

  // ---------- context menu + compose ----------
  const ctx = $('#ctxMenu');
  const compose = $('#compose');
  let pending = null; // {anchor, x, y}
  let composeMaxPrev = null;
  // The compose box is the draft card: rendered by threadHtml with status "draft", in the same
  // container in both modes (panel mode hides the header and handle by CSS).
  function renderCompose(text) {
    compose.innerHTML = threadHtml({ id: 'compose', draft: true, n: '+', status: 'draft', anchor: pending?.anchor, text: text || '', files: composeFiles, kind: pending?.kind, issueType: pending?.itype }, floatMode);
    compose.classList.remove('collapsed');
  }
  const clamp = (el, x, y) => {
    el.hidden = false;
    const r = el.getBoundingClientRect();
    const left = Math.min(x, window.innerWidth - r.width - 8);
    const top = Math.min(y, window.innerHeight - r.height - 8);
    el.style.left = `${Math.max(8, left)}px`; el.style.top = `${Math.max(8, top)}px`;
  };
  function hideCtx() { ctx.hidden = true; }
  // Closing the box (a click outside, Esc, cancel, "−") keeps the draft: its text in `drafts`, its
  // files in the file store, both reopened from the draft notice. Only send and the trash discard.
  function hideCompose() {
    const wasFloating = compose.classList.contains('float-compose');
    compose.hidden = true; pending = null; composeFiles = []; composeMaxPrev = null;
    try { CSS.highlights?.delete('markup-draft'); } catch { /* no highlight API */ }
    compose.classList.remove('float-compose', 'collapsed'); compose.style.cssText = ''; compose.innerHTML = '';
    if (wasFloating) layoutFloats(); // drops the connector
    showDraftNotice();
  }
  // The compose draft keeps its anchor, so it can be reopened at the same place after a reload.
  function saveComposeDraft() {
    const ta = $('#composeText'); if (!ta || !pending) return;
    const text = ta.value;
    drafts.compose = text.trim() || composeFiles.length ? { text, anchor: pending.anchor, at: new Date().toISOString(), files: composeFiles.length, ...(pending.kind === 'issue' ? { kind: 'issue', itype: pending.itype } : {}) } : null;
    saveDrafts();
    saveComposeFiles(); // this box's files replace an older draft's, like its text does
  }
  const discardComposeDraft = () => { drafts.compose = null; saveDrafts(); fileStore.put('compose', []); };
  function showDraftNotice() {
    let n = $('#draftNotice');
    if (!drafts.compose) { if (n) n.remove(); return; }
    if (!n) {
      n = document.createElement('div'); n.id = 'draftNotice'; n.className = 'draft-notice';
      n.innerHTML = `<span>${esc(T.draftPending)}</span><button type="button" class="btn small primary" data-act="openDraft">${esc(T.draftOpen)}</button><button type="button" class="btn small" data-act="dropDraft">${esc(T.draftDrop)}</button>`;
      document.body.appendChild(n);
      n.addEventListener('click', (e) => {
        const b = e.target.closest('[data-act]'); if (!b) return;
        if (b.dataset.act === 'dropDraft') { discardComposeDraft(); showDraftNotice(); return; }
        openComposeFromDraft();
      });
    }
    const nf = drafts.compose.files || 0;
    const dt = drafts.compose.text.trim().slice(0, 60);
    $('span', n).textContent = `${drafts.compose.kind === 'issue' ? T.reportDraft : T.draftPending}: ${[dt && `"${dt}"`, nf && `📎${nf}`].filter(Boolean).join(' + ')}`;
  }
  async function openComposeFromDraft() {
    const d = drafts.compose; if (!d) return;
    composeFiles = await fileStore.get('compose');
    const r = resolveAnchor(d.anchor);
    const el = r?.el || content;
    const b = el.getBoundingClientRect();
    const rect = { x: b.left + window.scrollX, y: b.top + window.scrollY, w: b.width, h: b.height };
    hideCtx();
    pending = { x: b.left + 20, y: b.top + 20, rect, blockRect: rect, block: el, anchor: d.anchor, ...(d.kind === 'issue' ? { kind: 'issue', itype: d.itype } : {}) };
    renderCompose(d.text);
    el.scrollIntoView({ block: 'center' });
    if (floatMode) openComposeFloating(); else clamp(compose, pending.x, pending.y);
    $('#draftNotice')?.remove();
    $('#composeText').focus();
  }
  setTimeout(showDraftNotice, 800);

  // ---------- attachments (compose + reply): file picker or clipboard paste ----------
  compose.addEventListener('change', async (e) => { if (e.target.id !== 'composeFile') return; composeFiles.push(...await collectFiles(e.target.files)); e.target.value = ''; renderAtt($('#composeAtt'), composeFiles); saveComposeDraft(); });
  compose.addEventListener('paste', async (e) => { if (e.target.id !== 'composeText') return; const fs = filesFromPaste(e); if (!fs.length) return; e.preventDefault(); composeFiles.push(...await collectFiles(fs)); renderAtt($('#composeAtt'), composeFiles); saveComposeDraft(); });
  document.addEventListener('change', async (e) => {
    if (!e.target.matches?.('input[type=file][data-file]')) return;
    const id = e.target.dataset.file; const files = replyFiles.get(id) || []; files.push(...await collectFiles(e.target.files)); replyFiles.set(id, files); e.target.value = '';
    renderAtt($(`.att-list[data-att="${id}"]`), files); saveReplyFiles(id);
  });
  document.addEventListener('input', (e) => {
    if (e.target.matches?.('.reply-box textarea')) setReplyDraft(e.target.closest('.thread').dataset.id, e.target.value);
    if (e.target.matches?.('.msg textarea')) setEditDraft(e.target.closest('.thread').dataset.id, e.target.closest('.msg').dataset.i, e.target.value);
    if (e.target.id === 'composeText') saveComposeDraft();
  });
  document.addEventListener('paste', async (e) => {
    if (!e.target.matches?.('.reply-box textarea')) return;
    const fs = filesFromPaste(e); if (!fs.length) return; e.preventDefault();
    const id = e.target.closest('.thread').dataset.id; const files = replyFiles.get(id) || []; files.push(...await collectFiles(fs)); replyFiles.set(id, files);
    renderAtt($(`.att-list[data-att="${id}"]`), files); saveReplyFiles(id);
  });
  document.addEventListener('click', (e) => {
    const rm = e.target.closest('.att-list[data-att] [data-rm]'); if (!rm) return;
    const list = rm.closest('.att-list'); const id = list.dataset.att; const files = replyFiles.get(id) || []; files.splice(Number(rm.dataset.rm), 1); replyFiles.set(id, files);
    renderAtt(list, files); saveReplyFiles(id);
  });

  // One way into a new comment, three doors: right-click (menu first), the "Comment" button that
  // appears under selected text, and the C key (the selection, else the block under the pointer).
  // The anchor is the selection when there is one inside the content, else the block.
  const contentSelection = () => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.rangeCount || !norm(sel.toString())) return null;
    const r = sel.getRangeAt(0);
    return content.contains(r.commonAncestorContainer) ? { sel, r } : null;
  };
  function buildPending(target, x, y) {
    const s = contentSelection();
    const quote = s ? norm(s.sel.toString()).slice(0, 500) : null;
    let block = target && target.closest ? target.closest(BLOCK_SEL) : null;
    if (s && !block) { const n = s.r.commonAncestorContainer; block = (n.nodeType === 1 ? n : n.parentElement)?.closest(BLOCK_SEL) || null; }
    if (block && !content.contains(block)) block = null;
    const sh = block ? sectionHead(block) : null;
    // where the floating compose card anchors: the selection itself, else the block
    const toDoc = (b) => ({ x: b.left + window.scrollX, y: b.top + window.scrollY, w: b.width, h: b.height });
    const rect = s ? toDoc(s.r.getBoundingClientRect()) : (block ? toDoc(block.getBoundingClientRect()) : null);
    const blockRect = block ? toDoc(block.getBoundingClientRect()) : rect;
    return { x, y, rect, blockRect, range: s ? s.r.cloneRange() : null, block, anchor: { section: sh ? textOf(sh) : null, sectionId: sh?.id || null, quote: quote || null, chain: block ? chainFor(block) : [] } };
  }
  function openCompose() {
    hideCtx(); selBtn.hidden = true;
    renderCompose('');
    // focus moves into the box and the browser drops the selection: keep the words marked in the
    // draft color until the comment is sent or dropped (review 29/09)
    try { if (pending.range && window.Highlight && CSS.highlights) CSS.highlights.set('markup-draft', new Highlight(pending.range)); } catch { /* no highlight API */ }
    if (floatMode && pending.rect) openComposeFloating(); else clamp(compose, pending.x, pending.y);
    $('#composeText').focus();
  }
  const selBtn = document.createElement('button');
  selBtn.type = 'button'; selBtn.className = 'btn small primary sel-comment'; selBtn.hidden = true;
  selBtn.innerHTML = `&#128172; ${esc(T.commentBtn)}`;
  document.body.appendChild(selBtn);
  if (!P.readonly) {
    content.addEventListener('contextmenu', (e) => {
      if (e.shiftKey) return; // native menu escape hatch
      e.preventDefault();
      hideCompose();
      pending = buildPending(e.target, e.clientX, e.clientY);
      ctxShownAt = Date.now();
      clamp(ctx, e.clientX, e.clientY);
    });
    // the button sits under the end of the selection; typing in a box or an open compose hides it
    let selTimer = 0;
    const placeSelBtn = () => {
      const s = contentSelection();
      const typing = document.activeElement?.matches?.('textarea, input, select, [contenteditable]');
      if (!s || typing || !compose.hidden) { selBtn.hidden = true; return; }
      const rects = s.r.getClientRects();
      const last = rects[rects.length - 1] || s.r.getBoundingClientRect();
      if (last.bottom < 0 || last.top > window.innerHeight) { selBtn.hidden = true; return; } // scrolled away: back when it is on screen
      selBtn.hidden = false;
      const bw = selBtn.offsetWidth, bh = selBtn.offsetHeight;
      const x = (isRtl ? last.left : last.right) - bw / 2;
      const y = last.bottom + bh + 14 > window.innerHeight ? last.top - bh - 8 : last.bottom + 8;
      selBtn.style.left = `${Math.max(8, Math.min(x, window.innerWidth - bw - 8))}px`;
      selBtn.style.top = `${Math.max(8, y)}px`;
    };
    document.addEventListener('selectionchange', () => { clearTimeout(selTimer); selTimer = setTimeout(placeSelBtn, 180); });
    window.addEventListener('scroll', () => { if (!selBtn.hidden) placeSelBtn(); }, { passive: true });
    selBtn.addEventListener('mousedown', (e) => e.preventDefault()); // keep the selection
    selBtn.addEventListener('click', () => {
      const s = contentSelection(); if (!s) { selBtn.hidden = true; return; }
      const b = selBtn.getBoundingClientRect();
      const n = s.r.commonAncestorContainer;
      hideCompose();
      pending = buildPending(n.nodeType === 1 ? n : n.parentElement, b.left, b.bottom + 4);
      openCompose();
    });
    let pointer = null;
    document.addEventListener('mousemove', (e) => { pointer = { x: e.clientX, y: e.clientY }; }, { passive: true });
    document.addEventListener('keydown', (e) => {
      if ((e.key !== 'c' && e.key !== 'C') || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target.matches?.('textarea, input, select, [contenteditable]') || !compose.hidden) return;
      const s = contentSelection();
      let target = null, x = 0, y = 0;
      if (s) { const b = s.r.getBoundingClientRect(); const n = s.r.commonAncestorContainer; target = n.nodeType === 1 ? n : n.parentElement; x = b.left; y = b.bottom + 4; }
      else if (pointer) { const el = document.elementFromPoint(pointer.x, pointer.y); if (el && content.contains(el)) { target = el; x = pointer.x; y = pointer.y; } }
      if (!target) return;
      e.preventDefault();
      hideCompose();
      pending = buildPending(target, x, y);
      openCompose();
    });
  }
  ctx.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b || !pending) return;
    openCompose();
  });
  // A report is about markup in general, never about a place on the page (user, 29/09: in the
  // right-click menu it competed with "comment"). Two doors: the TOC foot, where the box opens next to
  // the button, and the help popover, where it opens under the top bar.
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-report]'); if (!b) return;
    const r = b.getBoundingClientRect();
    const inHelp = Boolean(b.closest('#helpPop'));
    closeHelp();
    hideCompose();
    const x = inHelp ? r.left : isRtl ? r.left - 388 : r.right + 8, y = inHelp ? ($('.top')?.offsetHeight || 56) + 8 : r.top;
    pending = { x, y, rect: null, blockRect: null, anchor: { section: null, sectionId: null, quote: null, chain: [] }, kind: 'issue', itype: 'bug' };
    openCompose();
  });
  // First-visit tip: how to comment, until the page has a comment or the user closes it (once,
  // for every page: it is about the product, not about this plan).
  const TIP_KEY = 'markup:tip-comment';
  let tipEl = null;
  function renderTip() {
    let dismissed = false;
    try { dismissed = localStorage.getItem(TIP_KEY) === '1'; } catch { /* private mode */ }
    const want = !P.readonly && !dismissed && !(state.comments || []).length;
    if (!want) { if (tipEl) tipEl.hidden = true; return; }
    if (!tipEl) {
      tipEl = document.createElement('div');
      tipEl.className = 'comment-tip'; tipEl.setAttribute('role', 'note');
      const touch = window.matchMedia('(hover: none)').matches;
      tipEl.innerHTML = `<span>&#128172; ${esc(touch ? T.tipTouch : T.tipText)}</span><button type="button" class="btn small">${esc(T.tipClose)}</button>`;
      $('button', tipEl).addEventListener('click', () => { try { localStorage.setItem(TIP_KEY, '1'); } catch { /* private mode */ } tipEl.hidden = true; });
      document.body.appendChild(tipEl);
    }
    tipEl.hidden = false;
  }
  // Floating mode: the compose box is placed like a card (past the far edge of the block, level
  // with the selection), draggable by its header, resizable from its corner, with a connector.
  function openComposeFloating() {
    compose.classList.add('float-compose');
    compose.style.left = '0px'; compose.style.top = '0px'; compose.hidden = false;
    placeCompose();
  }
  // The anchor of an open compose box, measured live (document coordinates): the selection, else the block.
  function composeAnchor() {
    if (!pending) return null;
    const toDoc = (b) => ({ x: b.left + window.scrollX, y: b.top + window.scrollY, w: b.width, h: b.height });
    if (pending.block?.isConnected) pending.blockRect = toDoc(pending.block.getBoundingClientRect());
    if (pending.range) {
      pending.rect = toDoc(pending.range.getBoundingClientRect());
      const rs = pending.range.getClientRects(), last = rs[rs.length - 1];
      // where the saved card's #n badge will sit: over the end of the words (.c-badge.on-quote, 5px
      // above their top), so the line runs above the rest of the row, not through it (review 29/09)
      pending.end = last ? { x: (isRtl ? last.left : last.right) + window.scrollX, y: last.top - 5 + window.scrollY } : null;
      pending.endLine = last ? toDoc(last) : null;
    } else if (pending.blockRect) pending.rect = pending.blockRect;
    return pending.rect;
  }
  // The box opens where the user pointed: under the end of the selected words with its "+" at their
  // end, else at the pointer (right-click, C); above them when the window has no room below. Past the
  // far edge of the whole block it opened a table row's width away from the mouse (user, 29/09).
  function placeCompose() {
    composeAnchor();
    const cw = compose.offsetWidth || CARD_W, ch = compose.offsetHeight;
    const docW = document.documentElement.scrollWidth, sideW = panel.offsetWidth + GAP;
    const minX = isRtl ? sideW : 8, maxX = isRtl ? docW - 8 : docW - sideW;
    const sx = window.scrollX, sy = window.scrollY;
    const rs = pending.range ? pending.range.getClientRects() : null, last = rs && rs[rs.length - 1];
    const ax = (last ? (isRtl ? last.left : last.right) : pending.x) + sx;
    const top = (last ? last.top : pending.y) + sy, bottom = (last ? last.bottom : pending.y) + sy;
    const x = isRtl ? ax + 24 - cw : ax - 24; // the "+" pill sits 24px in from the box's inline-start edge
    let y = bottom + 10;
    if (y + ch > sy + window.innerHeight - 8 && top - ch - 10 >= sy + 8) y = top - ch - 10;
    compose.style.left = `${Math.max(minX, Math.min(x, maxX - cw))}px`;
    compose.style.top = `${Math.max(0, y)}px`;
    layoutFloats();
  }
  compose.addEventListener('pointerdown', (e) => {
    if (!compose.classList.contains('float-compose')) return;
    if (e.target.closest('.rs-handle')) return composeResize(e);
    const hd = e.target.closest('.thread-head');
    if (!hd || e.target.closest('button, a')) return;
    const sx = e.clientX, sy = e.clientY, ox = parseFloat(compose.style.left) || 0, oy = parseFloat(compose.style.top) || 0;
    try { hd.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    const move = (ev) => { if (pending) pending.moved = true; compose.style.left = `${ox + ev.clientX - sx}px`; compose.style.top = `${oy + ev.clientY - sy}px`; layoutFloats(); };
    const up = () => hd.removeEventListener('pointermove', move);
    hd.addEventListener('pointermove', move);
    hd.addEventListener('pointerup', up, { once: true });
    hd.addEventListener('pointercancel', up, { once: true });
  });
  function composeResize(e) {
    e.preventDefault(); e.stopPropagation();
    const hd = e.target.closest('.rs-handle');
    const w0 = compose.offsetWidth, h0 = compose.offsetHeight, left0 = parseFloat(compose.style.left) || 0;
    const sx = e.clientX, sy = e.clientY;
    try { hd.setPointerCapture(e.pointerId); } catch { /* synthetic pointer */ }
    const move = (ev) => {
      const dw = isRtl ? sx - ev.clientX : ev.clientX - sx;
      const w = Math.max(MIN_W, w0 + dw), h = Math.max(160, h0 + (ev.clientY - sy));
      compose.style.width = `${w}px`; compose.style.height = `${h}px`;
      if (isRtl) compose.style.left = `${left0 - (w - w0)}px`;
      layoutFloats();
    };
    const up = () => hd.removeEventListener('pointermove', move);
    hd.addEventListener('pointermove', move);
    hd.addEventListener('pointerup', up, { once: true });
    hd.addEventListener('pointercancel', up, { once: true });
  }
  async function sendCompose() {
    const text = $('#composeText').value.trim();
    if ((!text && !composeFiles.length) || !pending) return;
    const anchor = pending.anchor;
    const report = pending.kind === 'issue' ? { kind: 'issue', issueType: pending.itype || 'bug', ua: navigator.userAgent } : {};
    const sent = await sendOnce('compose', $('[data-act="send"]', compose), () => api('/comments', { method: 'POST', body: JSON.stringify({ text, anchor, version: P.version, attachments: composeFiles, ...report }) }));
    if (!sent) return;
    discardComposeDraft();
    hideCompose();
    window.getSelection()?.removeAllRanges();
    await poll(true);
  }
  // Compose card header: the same controls as a thread card. "−" hides the card and keeps the
  // draft (listed under "טיוטות"), ▢ maximizes to 80% of the content area, ▾ folds to the header,
  // the trash discards the draft.
  function toggleComposeMax() {
    const btn = $('[data-act="max"]', compose);
    if (composeMaxPrev) {
      Object.assign(compose.style, composeMaxPrev); composeMaxPrev = null;
      btn.textContent = '▢'; btn.title = T.maximize; layoutFloats(); return;
    }
    composeMaxPrev = { left: compose.style.left, top: compose.style.top, width: compose.style.width, height: compose.style.height };
    const cr = content.getBoundingClientRect();
    const topH = $('.top')?.offsetHeight || 0;
    const areaX = cr.left + window.scrollX, areaW = cr.width;
    const areaY = window.scrollY + topH, areaH = window.innerHeight - topH;
    compose.classList.remove('collapsed');
    compose.style.width = `${Math.round(areaW * 0.8)}px`; compose.style.height = `${Math.round(areaH * 0.8)}px`;
    compose.style.left = `${Math.round(areaX + areaW * 0.1)}px`; compose.style.top = `${Math.round(areaY + areaH * 0.1)}px`;
    btn.textContent = '❐'; btn.title = T.restore;
    layoutFloats();
  }
  compose.addEventListener('click', (e) => {
    const rm = e.target.closest('[data-rm]');
    if (rm) { e.stopPropagation(); composeFiles.splice(Number(rm.dataset.rm), 1); renderAtt($('#composeAtt'), composeFiles); saveComposeDraft(); return; }
    const ty = e.target.closest('[data-itype]');
    if (ty && pending) { pending.itype = ty.dataset.itype; $$('[data-itype]', compose).forEach((x) => x.setAttribute('aria-checked', String(x === ty))); saveComposeDraft(); return; }
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act;
    if (act === 'ghlink') { b.href = ghIssueUrl($('#composeText')?.value || '', pending?.itype || 'bug'); return; } // the link then opens as usual
    if (act === 'send') sendCompose();
    else if (act === 'cancel') hideCompose();
    else if (act === 'attach') $('#composeFile', compose)?.click();
    else if (act === 'min') { saveComposeDraft(); hideCompose(); }
    else if (act === 'max') toggleComposeMax();
    else if (act === 'collapse') {
      const card = $('.thread', compose); card.classList.toggle('collapsed');
      const f = card.classList.contains('collapsed'); compose.classList.toggle('collapsed', f);
      b.textContent = f ? '▸' : '▾'; b.title = f ? T.expand : T.collapse; layoutFloats();
    } else if (act === 'del') { discardComposeDraft(); hideCompose(); }
  });
  compose.addEventListener('keydown', (e) => { if (e.target.id !== 'composeText') return; if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); sendCompose(); } if (e.key === 'Escape') hideCompose(); });
  document.addEventListener('mousedown', (e) => {
    if (!ctx.hidden && !ctx.contains(e.target)) hideCtx();
    if (!compose.hidden && !compose.contains(e.target) && !ctx.contains(e.target)) hideCompose();
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { hideCtx(); hideCompose(); } });
  // a scroll that is still settling when the menu opens (smooth scroll, TOC jump) must not close it
  let ctxShownAt = 0;
  window.addEventListener('scroll', () => { if (Date.now() - ctxShownAt > 600) hideCtx(); }, { passive: true });

  // ---------- versions ----------
  const versionSel = $('#versionSel');
  let versionsKey = '';
  function renderVersions() {
    const key = state.versions.join('|') + state.version + JSON.stringify(state.notes || {});
    if (key === versionsKey) return;
    versionsKey = key;
    const list = state.versions.slice().reverse();
    const notes = state.notes || {};
    // Closed, the dropdown shows the date alone (a long change note crowded the top bar); open, every
    // entry carries its note. The note of the shown version is the tooltip.
    versionSel.innerHTML = list.map((v) => { const short = `${fmtVersion(v)}${v === state.version ? ` (${T.current})` : ''}`; const full = `${fmtVersion(v)}${notes[v] ? ` — ${notes[v]}` : ''}${v === state.version ? ` (${T.current})` : ''}`; return `<option value="${v}" data-short="${esc(short)}" data-full="${esc(full)}" ${v === P.version ? 'selected' : ''}>${esc(short)}</option>`; }).join('');
    versionSel.title = notes[P.version] || '';
    versionSel.hidden = list.length < 2;
  }
  const versionLabels = (full) => $$('option', versionSel).forEach((o) => { o.textContent = full ? o.dataset.full : o.dataset.short; });
  versionSel.addEventListener('mousedown', () => versionLabels(true));
  versionSel.addEventListener('keydown', () => versionLabels(true));
  versionSel.addEventListener('blur', () => versionLabels(false));
  versionSel.addEventListener('change', () => {
    const v = versionSel.value;
    location.href = v === state.version ? `/${P.dir}/` : `/${P.dir}/?v=${encodeURIComponent(v)}`;
  });

  // ---------- polling ----------
  // Every poll names this tab, so `publish` knows the page is open even when a background tab polls
  // only once a minute; closing the tab (or reloading it) tells the server at once.
  const TAB_ID = Math.random().toString(36).slice(2, 10);
  window.addEventListener('pagehide', () => { try { navigator.sendBeacon(`/${P.dir}/api/bye?tab=${TAB_ID}`); } catch { /* best effort */ } });
  async function poll(force) {
    let s;
    try { s = await api(`/state?tab=${TAB_ID}`); } catch {
      if (!serverDown) { serverDown = true; setBanner('', T.serverDown); }
      return;
    }
    if (serverDown) { serverDown = false; setBanner(P.readonly ? 'info' : '', P.readonly ? T.readonly : ''); }
    if (!P.readonly && s.version && s.version !== P.version) { location.reload(); return; }
    state = s;
    renderTip();
    renderWake();
    reconcileStatuses(s.comments);
    const json = JSON.stringify([s.comments, s.changed, s.versions]);
    if (json === lastJson && !force) return;
    lastJson = json;
    renderVersions();
    renderMarkers();
    rerender();
  }
  applyMode();
  poll(true);
  setInterval(() => poll(false), 2000);
  // mermaid/charts change layout after load — re-place badges once they settle
  setTimeout(() => poll(true), 1500);
})();
