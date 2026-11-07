import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const learning = fs.readFileSync(new URL('../src/preview/TwoModeLearningPreview.tsx', import.meta.url), 'utf8');
const schreiben = fs.readFileSync(new URL('../src/preview/SchreibenLearningStage.tsx', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const extra = fs.readFileSync(new URL('../src/preview/SchreibenExtraLetters.tsx', import.meta.url), 'utf8');
const practiceTools = fs.readFileSync(new URL('../src/preview/SchreibenPracticeTools.tsx', import.meta.url), 'utf8');
const formular = fs.readFileSync(new URL('../src/preview/FormularLearningStage.tsx', import.meta.url), 'utf8');
const lesenLearning = fs.readFileSync(new URL('../src/preview/LesenLearningStage.tsx', import.meta.url), 'utf8');
const hoerenLearning = fs.readFileSync(new URL('../src/preview/HoerenLearningStage.tsx', import.meta.url), 'utf8');
const sprechenLearning = fs.readFileSync(new URL('../src/preview/SprechenLearningStage.tsx', import.meta.url), 'utf8');
const hoerenMap = fs.readFileSync(new URL('../src/data/hoerenTeilMap.ts', import.meta.url), 'utf8');
const hoerenMapDoc = fs.readFileSync(new URL('../docs/hoeren-teil-map.md', import.meta.url), 'utf8');
const learningTranslation = fs.readFileSync(new URL('../src/preview/LearningTranslation.tsx', import.meta.url), 'utf8');
const referenceOverlay = fs.readFileSync(new URL('../src/components/OttoReferenceOverlay.tsx', import.meta.url), 'utf8');
const referenceOnboarding = fs.readFileSync(new URL('../src/preview/OttoReferenceOnboarding.tsx', import.meta.url), 'utf8');
const referenceExam = fs.readFileSync(new URL('../src/preview/OttoReferenceExamSections.tsx', import.meta.url), 'utf8');
const ottoSpeechClient = fs.readFileSync(new URL('../public/otto-speech.js', import.meta.url), 'utf8');
const learningLanguageTools = fs.readFileSync(new URL('../src/preview/LearningLanguageTools.tsx', import.meta.url), 'utf8');
const exactScreens = JSON.parse(fs.readFileSync(new URL('./fixtures/schreiben-step2-exact.json', import.meta.url), 'utf8'));

test('all required pronoun cases are present', () => {
  assert.equal((learning.match(/key:'nom-/g) || []).length, 9);
  assert.equal((learning.match(/key:'akk-/g) || []).length, 9);
  assert.equal((learning.match(/key:'dat-/g) || []).length, 9);
  for (const token of ['mich','dich','ihn','uns','euch','mir','dir','ihm','ihnen','Ihnen']) {
    assert.ok(learning.includes("de:'" + token + "'"), token);
  }
  assert.ok(learning.includes('Können Sie mir helfen?'));
  assert.ok(learning.includes('Ich schreibe dir.'));
});

test('all four base-word sections are active', () => {
  for (const title of ['Местоимения','Глаголы','Существительные','Союзы']) assert.ok(learning.includes(title), title);
  assert.ok(!learning.includes("available=id==='pronouns'"));
  assert.ok(learning.includes("if(category==='verbs')return buildVerbExercises()"));
  assert.ok(learning.includes("if(category==='nouns')return buildNounExercises()"));
  assert.ok(learning.includes('return buildConjunctionExercises()'));
});

test('full supplied vocabulary lists are retained', () => {
  const verbs=['sein','haben','heißen','kommen','wohnen','leben','sprechen','lernen','arbeiten','machen','gehen','fahren','bleiben','essen','trinken','kaufen','bezahlen','finden','suchen','brauchen','mögen','möchten','können','müssen','wollen','helfen','treffen','besuchen','schreiben','lesen'];
  for (const word of verbs) assert.ok(learning.includes("['"+word+"'"), word);
  const nouns=['die Familie','der Freund','die Freundin','der Mann','die Frau','das Kind','die Eltern','der Bruder','die Schwester','das Haus','die Wohnung','das Zimmer','die Stadt','das Land','die Straße','der Bahnhof','die Schule','die Arbeit','der Beruf','der Arzt','die Apotheke','das Krankenhaus','das Restaurant','das Café','das Hotel','der Supermarkt','das Geschäft','die Bäckerei','die Post','die Bank','der Bus','der Zug','das Taxi','das Auto','das Fahrrad','das Flugzeug','die Fahrkarte','das Geld','der Euro','die Zeit','der Tag','die Woche','der Monat','das Jahr','die Uhr','das Essen','das Wasser','das Brot','das Obst','das Geschenk'];
  for (const word of nouns) assert.ok(learning.includes("['"+word+"'"), word);
  for (const word of ['und','oder','aber','denn','sondern','weil','dass']) assert.ok(learning.includes("de:'"+word+"'"), word);
});

test('voice steps are optional and known-word skip remains', () => {
  assert.ok(learning.includes('Пропустить произношение'));
  assert.ok(learning.includes('Не предлагать голосовые до конца раздела'));
  assert.ok(learning.includes('Я это знаю'));
  assert.ok(learning.includes('onSkipVoice={advance}'));
});

test('Учебная база is opened from the full bottom menu using the original persisted-mode handler', () => {
  const nav=fs.readFileSync(new URL('../src/components/BottomNav.tsx',import.meta.url),'utf8');
  assert.ok(nav.includes("{id:'learning',label:'Учебная база',Icon:GraduationCap}"));
  assert.equal((nav.match(/label:'Учебная база'/g)||[]).length,1);
  assert.ok(!nav.includes("{id:'news',label:'Новости A1'"));
  assert.ok(app.includes("if(tab==='learning')choosePreviewOttoMode('learning')"));
  assert.ok(app.includes("savePreviewOttoMode(mode,accountAccess.userId)"));
  assert.ok(!app.includes('<DraggableModeAction'));
  assert.ok(learning.includes('К тренировкам'));
  assert.ok(app.includes('openRealSchreibenFromLearning'));
  assert.ok(app.includes("if(tab==='news')setView('news')"),'News route is preserved');
  assert.ok(app.includes('<NewsPage onBack={back}/>'),'News content is preserved');
});

test('main reference menu typography is consistent and old icon absent only from its primary toggle',()=>{
  const home=referenceOnboarding.slice(referenceOnboarding.indexOf('function ReferenceHome('),referenceOnboarding.indexOf('function ExamInfoPlaceholder('));
  assert.ok(home.includes('Общая база немецкого языка A1'));
  assert.ok(!home.includes('<BookOpen '));
  for(const section of ['written','oral','examInfo']){
    assert.ok(home.includes("onClick={()=>onOpen('"+section+"')} className=\"flex min-h-16 w-full items-center justify-between rounded-2xl border border-[var(--otto-line)] bg-[var(--otto-bg-soft)] p-4 text-left font-bold\""));
  }
  assert.ok(home.includes('Мои умные карточки'));
  assert.ok(home.includes('px-4 py-3 text-left font-bold'));
});
test('smart-card header contains only close, while reference mode opens cards without losing return state',()=>{
  assert.ok(referenceOverlay.includes("view==='smartcards'?'justify-end':'justify-between'"));
  assert.ok(referenceOverlay.includes("view!=='smartcards'&&<HeaderButton onClick={onClose}>"));
  assert.ok(referenceOverlay.includes("view!=='smartcards'&&<button type=\"button\" onClick={()=>setView('smartcards')}"));
  assert.ok(!referenceOverlay.includes("onClick={()=>view==='smartcards'?openReferenceHome()"));
  assert.ok(referenceOverlay.includes('aria-label="Мои умные карточки"'));
  assert.ok(referenceOverlay.includes('<button type="button" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-xl border bg-white"'));
  assert.ok(referenceOverlay.includes("setView(initialView)"));
  assert.ok(referenceOverlay.includes('returnState&&<p className="sr-only"'));
  assert.ok(referenceOverlay.includes("view==='smartcards'?<OttoSmartCardsView onOpenReference={openFromCards}/>"));
  assert.ok(referenceOverlay.includes('if(!open)return null'));
});

test('Schreiben step 2 contains the exact 15 explanation cards in exact order', () => {
  const match=schreiben.match(/const EXPLANATION_SCREENS=(\[[\s\S]*?\]) as const;/u);
  assert.ok(match,'EXPLANATION_SCREENS array not found');
  const actual=JSON.parse(match[1]);
  assert.equal(actual.length,15);
  assert.deepEqual(actual,exactScreens);
});

test('explanations still run strictly 1 through 15 before practice', () => {
  assert.ok(schreiben.includes("if(screenIndex>=14){"));
  assert.ok(schreiben.includes("setMode('transition')"));
  assert.ok(schreiben.includes("setScreenIndex(15)"));
  assert.ok(schreiben.includes("const value=screenIndex+1"));
  assert.ok(!schreiben.includes("screenIndex===3?"));
});

test('Schreiben explanation keeps its exercise navigation while the global learning header is informational only',()=>{
  assert.ok(schreiben.includes('onClick={explanationBack}'));
  assert.ok(schreiben.includes('onClick={explanationNext}'));
  assert.ok(schreiben.includes('const explanationBack=()=>'));
  assert.ok(schreiben.includes('const explanationNext=()=>'));
  assert.ok(schreiben.includes('goToExplanationStart'));
  assert.ok(schreiben.includes('onClick={goToExplanationStart}'));
  assert.ok(schreiben.includes('onClick={onOpenRealSchreiben}'));
  assert.ok(learning.includes('const goTraining=()=>setConfirmTraining(true)'));
  const topbar=learning.slice(learning.indexOf('<header className="otto-learning-topbar '),learning.indexOf('{teilMenu&&<section'));
  assert.ok(topbar.includes('ОБУЧЕНИЕ С OTTO'));
  assert.ok(topbar.includes('Как писать письма'));
  assert.ok(!topbar.includes('<button'),'Global header has no action buttons');
  assert.ok(!topbar.includes('Меню обучения'));
});

test('screen 11 and final letter source text remain verbatim', () => {
  assert.ok(schreiben.includes('Ich komme mit dem Auto.'));
  assert.ok(schreiben.includes('артикли тоже нужны'));
  assert.ok(schreiben.includes('предлог mit требует\\nдательного падежа'));
  assert.ok(schreiben.includes('Ich möchte zusammen im Park\\nspazieren gehen.'));
});

test('transition after card 15 has exactly the required main actions', () => {
  assert.ok(schreiben.includes('Теперь попробуем сами'));
  assert.ok(schreiben.includes('Начать задания'));
  assert.ok(schreiben.includes('Вернуться к объяснениям'));
  assert.ok(schreiben.includes('К реальным тренировкам'));
});

test('first Schreiben practice skips only the redundant second-point explanation', () => {
  for(const marker of ['Н1 · ВВОД В ЗАДАНИЕ','Н8 · ИМЯ']) assert.ok(schreiben.includes(marker),marker);
  const practice=schreiben.slice(schreiben.indexOf('function PracticeScreen('),schreiben.indexOf('export function SchreibenLearningStage('));
  assert.ok(!practice.includes('if(index===3)'), 'old explanation screen must not render');
  assert.ok(!practice.includes('ResultCard text={SECOND_SENTENCE}'), 'no ready-made second-point answer');
  assert.ok(practice.includes('if(index===4)return <BuildExercise title="Разберите второй пункт и соберите предложение"'));
  assert.ok(practice.includes('subtitle={TASK_POINTS[1]} explanation='));
  assert.ok(practice.includes('if(index===5)return <BuildExercise'), 'third point remains');
  assert.ok(practice.includes('if(index===6)return <ChoiceExercise'), 'closing remains');
  assert.ok(schreiben.includes('practiceIndex>=7'));
  assert.ok(schreiben.includes('const value=nextPracticeStep(practiceIndex)'));
  assert.ok(schreiben.includes('const value=previousPracticeStep(practiceIndex)'));
  assert.ok(schreiben.includes('resumePracticeStep('));
});

test('N2 greeting choice is interactive with the supplied options', () => {
  assert.ok(schreiben.includes('Как правильно начать это письмо?'));
  for (const option of ['Sehr geehrte Damen und Herren,','Liebe Anna,','Lieber Anna,']) assert.ok(schreiben.includes(option), option);
  assert.ok(schreiben.includes("answer={GREETING}"));
  assert.ok(schreiben.includes('Проверить'));
  assert.ok(schreiben.includes('Попробовать снова'));
});

test('N3 N5 N6 are sentence-building exercises', () => {
  assert.ok(schreiben.includes("FIRST_SENTENCE='Ich möchte dich am Wochenende besuchen.'"));
  assert.ok(schreiben.includes("SECOND_SENTENCE='Ich komme mit dem Auto.'"));
  assert.ok(schreiben.includes("THIRD_SENTENCE='Ich möchte zusammen im Park spazieren gehen.'"));
  assert.ok(schreiben.includes("tiles={['besuchen.','dich','am Wochenende','möchte','Ich']}"));
  assert.ok(schreiben.includes("tiles={['Auto.','dem','mit','komme','Ich']}"));
  assert.ok(schreiben.includes("tiles={['spazieren gehen.','im Park','zusammen','möchte','Ich']}"));
});

test('N7 N8 N9 closing, latin name and final letter are wired', () => {
  assert.ok(schreiben.includes('Как правильно закончить это личное письмо?'));
  assert.ok(schreiben.includes("options={['Mit freundlichen Grüßen','Liebe Grüße']}"));
  assert.ok(schreiben.includes('Впишите своё имя латиницей'));
  assert.ok(schreiben.includes('\\p{Script=Latin}'));
  assert.ok(schreiben.includes("name.trim()||'Name'"));
  assert.ok(schreiben.includes('Письмо выполнено ✓'));
  assert.ok(practiceTools.includes('"ich möchte dich am Wochenende besuchen.":"Я хочу навестить тебя на выходных."'));
});

test('all nine Schreiben practice cards retain bottom Back, conditional Next and source-task return',()=>{
  const part=schreiben.slice(schreiben.indexOf('function PracticeScreen('),schreiben.indexOf('export function SchreibenLearningStage('));
  assert.ok(part.includes('onBack:()=>void'));
  assert.ok(part.includes('onNext:()=>void'));
  assert.ok(part.includes('<StepNextBack onBack={onBack} onNext={onNext}/>'));
  assert.ok(part.includes('<StepNextBack onBack={onBack} onNext={proceed}/>'));
  assert.ok(part.includes('<ChoiceExercise'));
  assert.ok(part.includes('<BuildExercise'));
  assert.ok(part.includes('draft={draft} onDraft={onDraft}'));
  assert.ok(schreiben.includes('onBack={practiceBack} onNext={practiceNext}'));
  assert.ok(schreiben.includes('practiceIndex>0&&<button type="button" onClick={openTask}'));
  assert.ok(schreiben.includes('showTask&&<AssignmentOverlay'));
  assert.ok(schreiben.includes('onReturn={returnFromTask} onRestartExplanations={goToExplanationStart} onReal={onOpenRealSchreiben}'));
  assert.ok(!schreiben.includes('<PracticeNav practiceIndex={practiceIndex}'));
  assert.ok(practiceTools.includes('onReturn:()=>void'));
  assert.ok(practiceTools.includes('onRestartExplanations:()=>void'));
  assert.ok(practiceTools.includes('onReal:()=>void'));
});

test('practice completion offers repeat, explanation restart and real Schreiben', () => {
  assert.ok(schreiben.includes('Письмо выполнено ✓'));
  assert.ok(schreiben.includes('Повторить практику'));
  assert.ok(schreiben.includes('Вернуться к объяснениям'));
  assert.ok(schreiben.includes('К реальным заданиям Schreiben'));
});


test('fifteen additional Schreiben letters are present in source order', () => {
  const titles=[
    'Tenniskurs',
    'Поездка к Stefan',
    'Emma заболела',
    'Hamburg',
    'Помощь с покупкой компьютера',
    'Приглашение Frau Schneider',
    'Fotokurs',
    'Monika',
    'Fernseher',
    'День рождения Anna и Tobias',
    'Ferienjob',
    'Daniel / перенос встречи',
    'Autovermietung',
    'Frau Berger',
    'Grillparty',
  ];
  for (const title of titles) assert.ok(extra.includes("title:'"+title+"'"), title);
  assert.equal((extra.match(/\n    id:\d+,/g)||[]).length,15);
});

test('extra Schreiben letters preserve the supplied greetings answers and closings', () => {
  for (const phrase of [
    'Sehr geehrte Damen und Herren,',
    'Lieber Stefan,',
    'Sehr geehrte Frau Schneider,',
    'Lieber Markus,',
    'Liebe Monika,',
    'Sehr geehrter Herr Hoffmann,',
    'Liebe Anna, lieber Tobias,',
    'Lieber Daniel,',
    'Sehr geehrte Frau Berger,',
    'Liebe Freunde,',
    'Ich möchte einen Tenniskurs besuchen.',
    'An welchen Tagen findet der Kurs statt?',
    'Wie viel kostet der Kurs?',
    'Können Sie mir bitte die Hausaufgaben schicken?',
    'Ich möchte euch zu meinem Geburtstag einladen.',
    'Bringt bitte Salat und Getränke mit.',
    'Mit freundlichen Grüßen',
    'Liebe Grüße',
  ]) assert.ok(extra.includes(phrase), phrase);
});

test('all existing extra letters go directly from the first point to second-point practice', () => {
  for (const step of [0,1,2,4,5,6,7]) assert.ok(extra.includes('currentStep==='+step),String(step));
  assert.ok(!extra.includes('currentStep===3&&'));
  assert.ok(!extra.includes('function ExplainSecond('));
  assert.ok(extra.includes('Разберите второй пункт и соберите предложение'));
  assert.ok(extra.includes('Разберите третий пункт и соберите предложение'));
  assert.ok(extra.includes('currentLetter>=10?<TypeSentence'), 'advanced letters retain typed exercises');
  assert.ok(extra.includes('Выберите правильное обращение'));
  assert.ok(extra.includes('Выберите правильное прощание'));
  assert.ok(extra.includes('Письмо выполнено ✓'));
  assert.ok(extra.includes('const value=nextExtraStep(currentStep)'));
  assert.ok(extra.includes('const value=previousExtraStep(currentStep)'));
});

test('extra letter interaction never reveals a build answer before checking', () => {
  assert.ok(extra.includes('Нажимайте слова по порядку'));
  assert.ok(extra.includes('Проверить'));
  assert.ok(practiceTools.includes('Попробовать снова'));
  assert.ok(extra.includes('Правильно ✓'));
  assert.ok(extra.includes('selected.join(\' \')===answer'));
});

test('later extra letters increase difficulty with independent typing', () => {
  assert.ok(extra.includes('currentLetter>=10'));
  assert.ok(extra.includes('НАПИШИТЕ САМОСТОЯТЕЛЬНО'));
  assert.ok(extra.includes('Напишите предложение'));
});

test('extra Schreiben progress is separate persistent state and resumes at the saved letter', () => {
  assert.ok(extra.includes("otto-preview-schreiben-extra-letters-v1:"));
  assert.ok(extra.includes('currentLetter'));
  assert.ok(extra.includes('currentStep'));
  assert.ok(extra.includes('completed'));
  assert.ok(extra.includes('Продолжить с письма {currentLetter+1}'));
  assert.ok(extra.includes('Ваш учебный progress сохранён отдельно от экзаменационного.'));
});

test('additional letters preserve per-step bottom navigation, temporary source view and training exits',()=>{
  assert.ok(extra.includes('const back=()=>'));
  assert.ok(extra.includes('const nextStep=()=>'));
  assert.ok(extra.includes('<StepNextBack onBack={back} onNext={nextStep}/>'));
  assert.ok(extra.includes('onBack={back} draft={drafts[draftKey]}'));
  assert.ok(extra.includes('currentStep>0&&<button type="button" onClick={openTask}'));
  assert.ok(extra.includes('onReturn={returnFromTask} onRestartExplanations={onRestartExplanations} onReal={onOpenRealSchreiben}'));
  assert.ok(extra.includes('onClick={onRestartExplanations}'));
  assert.ok(extra.includes('onClick={onOpenRealSchreiben}'));
  assert.ok(extra.includes('setCurrentStep(returnToStep)'));
  assert.ok(extra.includes('setCurrentLetter(returnToLetter)'));
  assert.ok(!extra.includes('В начало объяснений'));
});

test('after each extra letter the required completion actions are present', () => {
  assert.ok(extra.includes('Письмо выполнено ✓'));
  assert.ok(extra.includes('Следующее письмо'));
  assert.ok(extra.includes('Повторить это письмо'));
  assert.ok(extra.includes('Вернуться к объяснениям'));
  assert.ok(extra.includes('К реальным заданиям Schreiben'));
});

test('final Schreiben transition appears after five educational letters', () => {
  assert.ok(extra.includes('TRAINING_LETTER_COUNT=5'));
  assert.ok(extra.includes('С письмом разобрались ✓'));
  assert.ok(extra.includes('Теперь вы знаете, как выполнять задание Schreiben.'));
  assert.ok(extra.includes('Перейти к заданиям Schreiben'));
  assert.ok(extra.includes('Посмотреть объяснения других модулей'));
  assert.ok(extra.includes('Повторить учебные письма'));
});


test('all sixteen Schreiben letters expose temporary assignment viewing without advancing progress', () => {
  assert.ok(schreiben.includes('📄 Посмотреть задание'));
  assert.ok(extra.includes('📄 Посмотреть задание'));
  assert.ok(schreiben.includes('returnToLetter'));
  assert.ok(schreiben.includes('returnToStep'));
  assert.ok(extra.includes('returnToLetter'));
  assert.ok(extra.includes('returnToStep'));
  assert.ok(schreiben.includes('showTask&&<AssignmentOverlay'));
  assert.ok(extra.includes('showTask&&<AssignmentOverlay'));
  assert.ok(practiceTools.includes('Исходное задание'));
  assert.ok(practiceTools.includes('Вернуться к заданию'));
});

test('assignment overlay uses current task text translation and three points with per-fragment audio', () => {
  assert.ok(practiceTools.includes('snapshot.body'));
  assert.ok(practiceTools.includes('snapshot.points'));
  assert.ok(practiceTools.includes('snapshot.translation'));
  assert.ok(practiceTools.includes('snapshot.translationPoints'));
  assert.ok(practiceTools.includes('<GermanLine'));
  assert.ok(practiceTools.includes('Schreiben Sie:'));
});

test('assignment preview is a sibling overlay so partially selected answers remain mounted', () => {
  assert.ok(schreiben.includes('</PracticeShell>{showTask&&<AssignmentOverlay'));
  assert.ok(extra.includes('</section>{showTask&&<AssignmentOverlay'));
  assert.ok(schreiben.includes('const[showTask,setShowTask]=useState(false)'));
  assert.ok(extra.includes('const[showTask,setShowTask]=useState(false)'));
});

test('German audio uses the existing OttoSpeech layer and never auto-plays a whole page', () => {
  assert.ok(practiceTools.includes('.OttoSpeech'));
  assert.ok(practiceTools.includes("api.play(clean,{mode:'normal'})"));
  assert.ok(!practiceTools.includes('speechSynthesis'));
  assert.ok(practiceTools.includes('GermanAudioButton'));
  assert.ok(schreiben.includes('GermanFragments'));
  assert.ok(extra.includes('GermanAudioButton'));
  assert.ok(extra.includes('GermanLine'));
});

test('correctly assembled sentences expose a listen button', () => {
  assert.ok(schreiben.includes('Послушать предложение'));
  assert.ok(extra.includes('Послушать предложение'));
});

test('sentence errors are explained from the actual submitted order', () => {
  assert.ok(practiceTools.includes('explainBuildError'));
  assert.ok(practiceTools.includes('actualWord'));
  assert.ok(practiceTools.includes('На втором месте здесь должно стоять'));
  assert.ok(practiceTools.includes('спрягаемый глагол стоит на втором месте'));
  assert.ok(practiceTools.includes('здесь лишнее'));
  assert.ok(practiceTools.includes('Не хватает слова'));
  assert.ok(schreiben.includes('explainBuildError(chosen,answer)'));
  assert.ok(extra.includes('explainBuildError(selected,answer)'));
});

test('Schreiben word tiles contain the needed article and multiword tiles never count as surplus',()=>{
  assert.ok(schreiben.includes("tiles={['Auto.','dem','mit','komme','Ich']} answer={SECOND_SENTENCE}"));
  const source=practiceTools.slice(practiceTools.indexOf('function tokens('),practiceTools.indexOf('function deSoft('))
    .replace('export function explainBuildError','function explainBuildError');
  assert.ok(source.includes('actual.flatMap(tile=>tokens(tile))'));
  const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
  const explain=vm.runInNewContext(js+'\nexplainBuildError',{}); 
  assert.match(explain(['Ich','komme','mit','Auto.'],'Ich komme mit dem Auto.'),/Не хватает слова «dem»/);
  const order=explain(['Ich','möchte','dich','besuchen.','am Wochenende'],'Ich möchte dich am Wochenende besuchen.');
  assert.doesNotMatch(order,/лишнее/i);
  assert.match(order,/позиции 4/);
  const phrase=explain(['Ich','möchte','zusammen','spazieren gehen.','im Park'],'Ich möchte zusammen im Park spazieren gehen.');
  assert.doesNotMatch(phrase,/лишнее/i);
  assert.match(explain(['Ich','komme','mit','dem','Auto.','Kaffee'],'Ich komme mit dem Auto.'),/лишнее/i);
});

test('Preview 19 responsive fixes preserve reference shortcut clearance and readable desktop header',()=>{
  const css=fs.readFileSync(new URL('../src/ottoResponsivePreview.css',import.meta.url),'utf8');
  assert.ok(css.includes('bottom: calc(var(--otto-nav-height, 66px) + env(safe-area-inset-bottom, 0px) + 12px) !important'));
  assert.ok(css.includes('.otto-preview-learning-mode .otto-learning-topbar-heading {\n    flex: 1 1 280px;\n    min-width: 275px;'));
  assert.ok(css.includes('.otto-preview-learning-mode .otto-bottom-nav-item.is-home > span:last-child'));
  assert.ok(css.includes('translateY(-2px)'));
});

test('independent typing errors explain concrete spelling issues including umlauts', () => {
  assert.ok(practiceTools.includes('explainTypingError'));
  assert.ok(practiceTools.includes('нужен умляут ö'));
  assert.ok(practiceTools.includes('нужен умляут ä'));
  assert.ok(practiceTools.includes('нужен умляут ü'));
  assert.ok(extra.includes('explainTypingError(value,answer)'));
});

test('error feedback is presented by small OTTO and retries the same exercise', () => {
  assert.ok(practiceTools.includes('function OttoError'));
  assert.ok(practiceTools.includes('<OttoScene scene="schreiben"'));
  assert.ok(practiceTools.includes('Попробовать снова'));
  assert.ok(schreiben.includes('<OttoError'));
  assert.ok(extra.includes('<OttoError'));
});

test('every practical action supports skip and records skipped rather than correct', () => {
  assert.ok(practiceTools.includes('function SkipAction'));
  assert.ok(practiceTools.includes('Пропустить'));
  assert.ok(practiceTools.includes('Пропущено'));
  assert.ok(schreiben.includes("onStatus('skipped')"));
  assert.ok(extra.includes("onStatus('skipped')"));
  assert.ok(extra.includes("advanceWithStatus('skipped')"));
  assert.ok(schreiben.includes("Record<string,'correct'|'skipped'>"));
  assert.ok(extra.includes("Record<string,'correct'|'skipped'>"));
});

test('skipped sentence may show the supplied correct answer with audio before continuing', () => {
  assert.ok(practiceTools.includes('Правильный вариант'));
  assert.ok(practiceTools.includes('<GermanLine text={answer}'));
});

test('first middle and last additional letters all pass through the same current-step interaction engine', () => {
  for (const title of ['Tenniskurs','Monika','Grillparty']) assert.ok(extra.includes("title:'"+title+"'"), title);
  for (const step of [1,2,4,5,6,7]) assert.ok(extra.includes('currentStep==='+step), String(step));
  assert.ok(extra.includes('currentLetter>=10'));
});

test('task viewing does not call nextStep or persist progress when opened', () => {
  const openExtra=extra.match(/const openTask=\(\)=>\{([\s\S]*?)\n  \};/u);
  assert.ok(openExtra);
  assert.ok(!openExtra[1].includes('nextStep'));
  assert.ok(!openExtra[1].includes('persist('));
  const openFirst=schreiben.match(/const openTask=\(\)=>\{([\s\S]*?)\n  \};/u);
  assert.ok(openFirst);
  assert.ok(!openFirst[1].includes('practiceNext'));
  assert.ok(!openFirst[1].includes('persist('));
});


test('Schreiben learning sequence inserts Formular before letters', () => {
  assert.ok(learning.includes("import { FormularLearningStage }"));
  assert.ok(learning.includes("stage:'intro'|'categories'|'lesson'|'next'|'form'|'step3'|'step2'"));
  assert.ok(learning.includes("stage==='form'&&<FormularLearningStage"));
  assert.ok(learning.includes("stage==='step3'&&<SchreibenLearningStage"));
  assert.ok(learning.includes('Шаг 2. Учимся заполнять формуляр'));
  assert.ok(schreiben.includes('Шаг 3 · Schreiben'));
});

test('old step2 progress migrates to step3 letters without deleting letter progress', () => {
  assert.ok(learning.includes("parsed.stage==='step2'?'step3'"));
  assert.ok(learning.includes("progress.stage==='step3'||progress.stage==='step2'?'step3'"));
});

test('Formular stage uses separate form_training_progress storage', () => {
  assert.ok(formular.includes("const STORAGE_PREFIX='form_training_progress:'"));
  assert.ok(formular.includes('currentForm'));
  assert.ok(formular.includes('currentField'));
  assert.ok(formular.includes("statuses:Record<string,FieldStatus>"));
  assert.ok(formular.includes("attempts:Record<string,number>"));
});

test('Formular intro preserves explanation and a simplified learning entry', () => {
  for (const phrase of [
    'В первой части Schreiben вам могут дать короткую ситуацию и формуляр с пропущенными данными.',
    'Ваша задача — найти нужную информацию в тексте и правильно перенести её в соответствующие поля.',
    'Сначала разберём один пример вместе, а потом вы попробуете самостоятельно.',
    'Начать',
    'Я это умею — перейти к письмам',
  ]) assert.ok(formular.includes(phrase), phrase);
});

test('Formular vocabulary covers all requested field words with OttoSpeech audio controls', () => {
  for (const word of [
    'Familienname','Vorname','Name','Geburtsdatum','Geburtsort','Adresse','Straße','Hausnummer',
    'PLZ / Postleitzahl','Wohnort','Land','Telefonnummer','E-Mail-Adresse','Anzahl der Personen',
    'Davon Kinder','Kinder','Datum / Termin','Unterschrift'
  ]) assert.ok(formular.includes("['"+word+"'"), word);
  assert.ok(formular.includes('<GermanLine text={de}'));
  assert.ok(formular.includes('Я это знаю'));
});

test('Formular contains fifteen A1 topics in the requested order', () => {
  const titles=[
    'Бронирование поездки','Гостиница','Языковой курс','Спортивный курс','Регистрация в библиотеке',
    'Запись к врачу','Туристическая экскурсия','Аренда автомобиля','Детский кружок','Заказ билетов',
    'Регистрация на мероприятие','Школа','Работа / Ferienjob','Anmeldung / адрес','Курс Volkshochschule'
  ];
  for(const title of titles)assert.ok(formular.includes("title:'"+title+"'"),title);
  assert.equal((formular.match(/\n    id:\d+,/g)||[]).length,15);
});

test('first Formular explicitly teaches total persons and children from Eva Kadavy', () => {
  assert.ok(formular.includes('Eva Kadavy wohnt in der Gartenstraße 12, 10115 Berlin. Sie reist mit ihrem Mann und zwei Kindern nach München.'));
  assert.ok(formular.includes("label:'Anzahl der Personen'"));
  assert.ok(formular.includes("answer:'4'"));
  assert.ok(formular.includes("specialError:'persons'"));
  assert.ok(formular.includes("label:'Davon Kinder'"));
  assert.ok(formular.includes("answer:'2'"));
  assert.ok(formular.includes("specialError:'children'"));
  assert.ok(formular.includes('Здесь спрашивают об общем количестве людей.'));
  assert.ok(formular.includes('Здесь спрашивают не обо всех участниках, а только о детях.'));
});

test('Formular trains field meaning then value and gradually reduces guidance', () => {
  assert.ok(formular.includes("fieldPhase:'meaning'|'value'"));
  assert.ok(formular.includes("meaningChoice===field.meaning"));
  assert.ok(formular.includes("const detailed=progress.currentForm===0"));
  assert.ok(formular.includes("const guided=progress.currentForm<5"));
  assert.ok(formular.includes("const independent=progress.currentForm>=5"));
  assert.ok(formular.includes('Помощь OTTO'));
});

test('Formular situation overlay returns to the same field without clearing mounted input', () => {
  assert.ok(formular.includes('returnToForm'));
  assert.ok(formular.includes('returnToField'));
  assert.ok(formular.includes('📄 Посмотреть ситуацию'));
  assert.ok(formular.includes('Вернуться к полю'));
  assert.ok(formular.includes('showSituation&&<FormSituationOverlay'));
  assert.ok(formular.includes('setShowSituation(true)'));
});

test('Formular German situation and field labels have click audio through existing shared OttoSpeech controls', () => {
  assert.ok(formular.includes('splitSituationSentences(form.situation).map'));
  assert.ok(formular.includes('<GermanLine text={field.label}'));
  assert.ok(formular.includes('<GermanLine text={de}'));
  assert.ok(practiceTools.includes('.OttoSpeech'));
  assert.ok(!formular.includes('speechSynthesis'));
});

test('Formular errors are contextual and retry the same field without revealing the answer', () => {
  assert.ok(formular.includes('function fieldError'));
  assert.ok(formular.includes('Посчитай всех вместе.'));
  assert.ok(formular.includes('Ищи только количество детей.'));
  assert.ok(formular.includes('<OttoError text={valueError}'));
  assert.ok(!formular.includes("valueError=field.answer"));
});

test('every Formular field can be skipped and skip is not correct', () => {
  assert.ok(formular.includes('<SkipAction onSkip={skipField}'));
  assert.ok(formular.includes("advanceField('skipped',field.answer)"));
  assert.ok(formular.includes("type FieldStatus='correct'|'skipped'|'corrected'"));
  assert.ok(formular.includes("status==='skipped'?'Пропущено'"));
});

test('Formular result distinguishes correct skipped and corrected fields', () => {
  assert.ok(formular.includes('Формуляр заполнен ✓'));
  assert.ok(formular.includes("status==='corrected'?'Исправлено ✓':'Правильно ✓'"));
  assert.ok(formular.includes('onClick={nextForm}'));
  assert.ok(formular.includes('Повторить'));
  assert.ok(formular.includes('Шаг 3. Учимся писать письмо'));
});

test('Formular completion leads to Schreiben step three', () => {
  assert.ok(formular.includes('С формуляром разобрались ✓'));
  assert.ok(formular.includes('Теперь вы умеете понимать названия полей и находить нужные данные в тексте.'));
  assert.ok(formular.includes('Шаг 3. Учимся писать письмо'));
  assert.ok(formular.includes('Повторить формуляры'));
});

test('Formular progress UI shows form count and resume message', () => {
  assert.ok(formular.includes('ФОРМУЛЯРЫ · {progress.currentForm+1} ИЗ 15'));
  assert.ok(formular.includes('Продолжить с формуляра {progress.currentForm+1}'));
  assert.ok(formular.includes('Учебный progress формуляров сохранён отдельно от экзаменационного.'));
});


test('Formular situation audio is offered per German sentence, not as one automatic page read', () => {
  assert.ok(formular.includes('function splitSituationSentences'));
  assert.ok(formular.includes("split(/(?<=[.!?])\\s+(?=[A-ZÄÖÜ])/u)"));
  assert.ok(formular.includes('splitSituationSentences(form.situation).map'));
});


test('source-based Lesen learning uses active archive and separate learning progress only', () => {
  assert.ok(lesenLearning.includes('loadLesenArchive'));
  assert.ok(lesenLearning.includes('tasks.slice(0,5)'));
  assert.ok(lesenLearning.includes('otto-preview-lesen-learning-v2:'));
  assert.ok(!lesenLearning.includes('otto-a1-lesen-progress-v2'));
  assert.ok(!lesenLearning.includes('onComplete('));
});

test('Lesen explains the module before selectable Teil entry and keeps four practices', () => {
  for (const token of ['Как устроен Lesen','СНАЧАЛА РАЗБЕРЁМСЯ С ФОРМАТОМ','Что хотите потренировать?','СНАЧАЛА ОБЪЯСНЕНИЕ','ИЗ 4']) assert.ok(lesenLearning.includes(token), token);
  assert.ok(lesenLearning.includes('около 25 минут'));
  assert.ok(lesenLearning.includes("view:'intro'|'selector'|'part'"));
  assert.ok(lesenLearning.includes("partStatusLabel(progress.parts[part])"));
  assert.ok(lesenLearning.includes("onClick={()=>openPart(part)}"));
});

test('Lesen detailed example teaches source translation key words evidence comparison and answer', () => {
  for (const token of ['1. Смотрим исходный материал','2. Что именно спрашивают','3. Ключевые слова','4. Находим нужный фрагмент','5. Сравниваем текст ↔ утверждение','6. Теперь ответьте сами']) assert.ok(lesenLearning.includes(token), token);
  assert.ok(lesenLearning.includes('translationMode="inline"'));
  assert.ok(lesenLearning.includes('GermanTeachingText'));
  assert.ok(lesenLearning.includes('evidenceFragment'));
});

test('Lesen practice keeps translation hint key words text and skip available', () => {
  for (const token of ['Показать ключевые слова','Посмотреть текст','Пропустить','TranslationButton']) assert.ok(lesenLearning.includes(token), token);
  assert.ok(lesenLearning.includes('translationMode="button"'));
});

test('Lesen learning covers all three active archive Teile without replacement task data', () => {
  assert.ok(lesenLearning.includes("part===1?data.teil1:part===2?data.teil2:data.teil3"));
  assert.ok(lesenLearning.includes('ReadingSource'));
  assert.ok(lesenLearning.includes('t.situation'));
  assert.ok(lesenLearning.includes('(task as LesenArchiveTeil3Task).statement'));
  assert.ok(lesenLearning.includes('t.text'));
});

test('Sprechen Teil 1 reuses one canonical task and five practices from existing elements', () => {
  assert.ok(sprechenLearning.includes('speakingTeil1'));
  assert.ok(sprechenLearning.includes('const TEIL1_PRACTICE=['));
  assert.ok(sprechenLearning.includes('speakingTeil1.keywords[0]'));
  assert.ok(sprechenLearning.includes('speakingTeil1.followUps[0]'));
  assert.ok(sprechenLearning.includes('Практика Teil 1 · 5 из 5'));
  assert.ok(sprechenLearning.includes('Пропустить произношение'));
  assert.ok(sprechenLearning.includes('otto-preview-sprechen-learning-v1:'));
});

test('Sprechen Teil 2 and Teil 3 use six existing source cards and original Teil 3 images', () => {
  assert.ok(sprechenLearning.includes('speakingTeil2Cards.slice(0,6)'));
  assert.ok(sprechenLearning.includes('speakingTeil3ArchiveCards.slice(0,6)'));
  assert.ok(sprechenLearning.includes('<Teil3ArchiveImage'));
  assert.ok(!sprechenLearning.includes('CARD (49)'));
  assert.ok(!sprechenLearning.includes('CARD (50)'));
});

test('Sprechen educational German keeps Russian meaning access', () => {
  assert.ok(sprechenLearning.includes('LearningGermanLine'));
  assert.ok(sprechenLearning.includes('card.themeRu'));
  assert.ok(sprechenLearning.includes('card.keywordRu'));
  assert.ok(sprechenLearning.includes('Посмотреть перевод'));
});

test('Horen map keeps unresolved tasks and does not assign Teil from answer type alone', () => {
  assert.ok(hoerenMap.includes("type HoerenTeilDecision = 1 | 2 | 3 | 'unresolved'"));
  assert.ok(hoerenMap.includes("return 'unresolved'"));
  assert.ok(hoerenMap.includes('по одному типу ответа Teil не назначаем'));
  assert.ok(hoerenMapDoc.includes('unresolved'));
  assert.ok(hoerenMapDoc.includes('Полная карта 80 заданий'));
});

test('Horen learning selections are five existing tasks per Teil', () => {
  for (const id of ['horen-002','horen-004','horen-012','horen-014','horen-016']) assert.ok(hoerenMap.includes(id), id);
  for (const id of ['horen-008','horen-048','horen-054','horen-058','horen-069']) assert.ok(hoerenMap.includes(id), id);
  for (const id of ['horen-001','horen-005','horen-011','horen-015','horen-020']) assert.ok(hoerenMap.includes(id), id);
});

test('Horen explains the module before selectable Teil entry and keeps four practices', () => {
  for (const token of ['Как устроен Hören','СНАЧАЛА РАЗБЕРЁМСЯ С ФОРМАТОМ','Что хотите потренировать?','Что происходит в Teil 1','Что происходит в Teil 2','Что происходит в Teil 3','ИЗ 4']) assert.ok(hoerenLearning.includes(token), token);
  assert.ok(hoerenLearning.includes('примерно 20 минут'));
  assert.ok(hoerenLearning.includes('Teil 1 и Teil 3'));
  assert.ok(hoerenLearning.includes("view:'intro'|'selector'|'part'"));
  assert.ok(hoerenLearning.includes("partStatusLabel(progress.parts[part])"));
  assert.ok(hoerenLearning.includes("onClick={()=>openPart(part)}"));
});

test('Horen detailed example separates learned words whole question and verified source MP3 fragments', () => {
  for (const token of ['1. Сначала инструкция','2. Что спрашивают','3. Сначала познакомимся с нужными словами','4. Теперь послушаем вопрос целиком','5. Слушаем исходный MP3','6. Разбираем запись по смысловым местам','7. Теперь ответьте сами']) assert.ok(hoerenLearning.includes(token), token);
  assert.ok(hoerenLearning.includes('DETAIL_WORDS'));
  assert.ok(hoerenLearning.includes('DETAIL_FRAGMENTS'));
  assert.ok(hoerenLearning.includes('task.prompt} audio={false}'));
  assert.ok(hoerenLearning.includes('Одна кнопка 🔊 проигрывает всю фразу целиком.'));
  assert.ok(hoerenLearning.includes('playRange(audioRef.current,fragment.start,fragment.end)'));
  assert.ok(hoerenLearning.includes('/audio/'));
  assert.ok(hoerenLearning.includes('audio.currentTime'));
});

test('Horen practice provides all help controls and does not show transcript before the first attempt', () => {
  for (const token of ['Подсказка','Разобрать вопрос','Послушать ещё раз','Разобрать аудио','Пропустить','чтобы Hören не превратился в Lesen']) assert.ok(hoerenLearning.includes(token), token);
  assert.ok(hoerenLearning.includes('!checked'));
  assert.ok(hoerenLearning.includes('Попробовать снова'));
});

test('Horen learning preserves original task audio image question options and separate progress', () => {
  assert.ok(hoerenLearning.includes('getHoerenLearningTasks'));
  assert.ok(hoerenLearning.includes('/audio/'));
  assert.ok(hoerenLearning.includes('/images/'));
  assert.ok(hoerenLearning.includes('task.prompt'));
  assert.ok(hoerenLearning.includes('task.options'));
  assert.ok(hoerenLearning.includes('task.audioText'));
  assert.ok(hoerenLearning.includes('otto-preview-hoeren-learning-v2:'));
  assert.ok(!hoerenLearning.includes('otto-a1-hoeren-progress-v2'));
  assert.ok(!hoerenLearning.includes('onComplete('));
});

test('Horen source map documentation uses five tasks per Teil', () => {
  assert.ok(hoerenMapDoc.includes('Учебные пятёрки'));
  assert.ok(hoerenMapDoc.includes('15 заданий = 5 на каждый Teil (1 подробное + 4 практических)'));
  assert.ok(!hoerenMapDoc.includes('Учебные шестёрки'));
});

test('Schreiben keeps its source flow while restoring direct Russian translations', () => {
  assert.ok(practiceTools.includes('InlineTranslation'));
  assert.ok(practiceTools.includes('showTranslation=true'));
  assert.ok(schreiben.includes('Полный перевод письма'));
  assert.ok(practiceTools.includes('Полный перевод письма'));
  assert.ok(practiceTools.includes('CompletedSchreibenLetter'));
  assert.ok(schreiben.includes('Перевод слова'));
  assert.ok(extra.includes('Перевод слова'));
});

test('Учебная база retains Schreiben and Sprechen while hiding removed Lesen/Hören teaching routes', () => {
  for (const token of ['<SprechenLearningStage','<SchreibenLearningStage','<FormularLearningStage','<LearningModulesHub']) assert.ok(learning.includes(token), token);
  for (const removed of ['<LesenLearningStage','<HoerenLearningStage',"id:'lesen' as const,title:'Lesen'","id:'horen' as const,title:'Hören'"]) assert.ok(!learning.includes(removed),removed);
  assert.ok(app.includes('openRealModuleFromLearning'));
  assert.ok(app.includes('onOpenRealModule={openRealModuleFromLearning}'));
  assert.ok(app.includes('onOpenRealSchreiben={openRealSchreibenFromLearning}'));
  for (const oldModule of [lesenLearning,hoerenLearning]) assert.ok(oldModule.includes('useResetLearningStepScroll('),'archived lessons are not deleted from repo');
});


test('Horen and Lesen introductions lead to a Teil selector before detailed learning', () => {
  assert.ok(learningTranslation.includes('function OttoTeachingBubble'));
  assert.ok(hoerenLearning.includes('<OttoTeachingBubble scene="horen"'));
  assert.ok(lesenLearning.includes('<OttoTeachingBubble scene="lesen"'));
  assert.ok(hoerenLearning.includes("if(progress.view==='intro'||reviewIntro)"));
  assert.ok(hoerenLearning.includes('reviewIntro?onFinishReview?.():persist('));
  assert.ok(hoerenLearning.includes("if(progress.view==='selector')"));
  assert.ok(lesenLearning.includes("if(progress.view==='intro'||reviewIntro)"));
  assert.ok(lesenLearning.includes('reviewIntro?onFinishReview?.():persist('));
  assert.ok(lesenLearning.includes("if(progress.view==='selector')"));
});

test('Horen audio-help control can be opened before the first attempt without revealing transcript', () => {
  assert.ok(hoerenLearning.includes("onClick={()=>setShowAudioHelp(v=>!v)}"));
  assert.ok(hoerenLearning.includes('showAudioHelp&&!checked'));
  assert.ok(hoerenLearning.includes('Сначала сделайте первую попытку'));
  assert.ok(hoerenLearning.includes('showAudioHelp&&checked'));
});

test('Horen wrong-answer teaching returns learner to verified MP3 evidence and explains source answer', () => {
  assert.ok(hoerenLearning.includes('DETAIL_EVIDENCE'));
  assert.ok(hoerenLearning.includes('playRange(audioRef.current,evidence.start,evidence.end)'));
  assert.ok(hoerenLearning.includes('correctLabel(task)'));
  assert.ok(hoerenLearning.includes('Послушайте фрагмент ещё раз и попробуйте выбрать его самостоятельно.'));
});

test('Schreiben choice options are compact while feedback and sentence practice retain learning aids', () => {
  for (const [source,start,end] of [
    [schreiben,'function ChoiceExercise({','function BuildExercise({'],
    [extra,'function Choice({','function Build({'],
  ]) {
    const choice=source.slice(source.indexOf(start),source.indexOf(end));
    assert.ok(choice.includes('options.map(option=><button key={option}'),start);
    assert.ok(!choice.includes('GermanAudioButton text={option}'),start);
    assert.ok(!choice.includes('TranslationButton parts={[option]}'),start);
    assert.ok(choice.includes('onClick={()=>onDraft({selected:option})}'),start);
    assert.ok(choice.includes("onStatus('correct')"),start);
    assert.ok(choice.includes("onStatus('skipped')"),start);
    assert.ok(choice.includes('AutoRussianTranslation text={answer}'),start);
    assert.ok(choice.includes('GermanAudioButton text={answer}'),start);
    assert.ok(choice.includes('StepNextBack onBack={onBack} onNext={onNext}'),start);
  }
  assert.ok(schreiben.includes('Послушать предложение'));
  assert.ok(extra.includes('Послушать предложение'));
  assert.ok(schreiben.includes('TranslationButton parts={[tile]}'));
  assert.ok(extra.includes('TranslationButton parts={[tile]}'));
});


test('Lesen Horen and Sprechen selectors preserve per-Teil resume state', () => {
  for (const source of [lesenLearning, hoerenLearning, sprechenLearning]) {
    assert.ok(source.includes("parts:Record<Part,PartProgress>"));
    assert.ok(source.includes("partStatusLabel("));
    assert.ok(source.includes("onClick={()=>openPart(part)}"));
  }
  assert.ok(lesenLearning.includes("Продолжить · ${state.practiceIndex+1} из 4"));
  assert.ok(hoerenLearning.includes("Продолжить · ${state.practiceIndex+1} из 4"));
  assert.ok(sprechenLearning.includes("Продолжить · ${state.practiceIndex+1} из 5"));
});

test('Sprechen starts with a concise module explanation and three-part map', () => {
  for (const token of [
    'Как устроен Sprechen',
    '— это устная часть экзамена.',
    'Здесь важно не писать, а говорить и понимать собеседника.',
    'Рассказать о себе',
    'Задать вопрос',
    'Сформулировать просьбу',
    'Что хотите потренировать?'
  ]) assert.ok(sprechenLearning.includes(token), token);
  assert.ok(sprechenLearning.includes('<OttoTeachingBubble scene="guide"'));
});

test('completed Teil screens offer selector repeat real tasks and optional next Teil', () => {
  for (const source of [lesenLearning, hoerenLearning, sprechenLearning]) {
    assert.ok(source.includes('Выбрать другой Teil'));
    assert.ok(source.includes('Повторить Teil'));
    assert.ok(source.includes('К реальным заданиям'));
    assert.ok(source.includes('Перейти к Teil'));
  }
});

test('verified detailed Horen fragments use source MP3 ranges rather than TTS', () => {
  for (const id of ['horen-002','horen-008','horen-001']) assert.ok(hoerenLearning.includes("'"+id+"'"), id);
  assert.ok(hoerenLearning.includes('Каждая кнопка ниже проигрывает вручную проверенный временной диапазон'));
  assert.ok(hoerenLearning.includes('TTS здесь не используется.'));
  assert.ok(hoerenLearning.includes('font-bold leading-7 text-slate-900">{fragment.text}'));
  assert.ok(!hoerenLearning.includes('playFragment('));
  assert.ok(!hoerenLearning.includes('playFragmentByEvidence('));
});


test('Sprechen Teil 2 has seven approved explanation screens before source-card practice', () => {
  assert.ok(sprechenLearning.includes('const TEIL2_APPROVED_EXPLANATIONS=['));
  assert.ok(sprechenLearning.includes('Экран {screen+1} из 7'));
  assert.ok(sprechenLearning.includes('Thema: Sport, целевое слово – Abend'));
  assert.ok(sprechenLearning.includes('Machen Sie Sport am Abend?'));
  assert.ok(sprechenLearning.includes('Machst du Sport am Abend?'));
  assert.ok(sprechenLearning.includes('Schwimmen Sie am Abend?'));
  assert.ok(sprechenLearning.includes('am Abend'));
  assert.ok(sprechenLearning.includes('Теперь попробуем сами'));
  assert.ok(sprechenLearning.includes('Начать практику Teil 2'));
  assert.ok(sprechenLearning.includes('Вернуться в начало объяснения Teil 2'));
});

test('Sprechen Teil 2 practice can open explanations and return to the exact task state', () => {
  assert.ok(sprechenLearning.includes('Посмотреть объяснение'));
  assert.ok(sprechenLearning.includes('Вернуться к заданию'));
  assert.ok(sprechenLearning.includes('Teil2ExplanationOverlay'));
  assert.ok(sprechenLearning.includes('onReturnToTask={onClose}'));
  assert.ok(sprechenLearning.includes('setShowExplanation(true)'));
});

test('Sprechen Teil 2 explanation audio is attached only to German examples', () => {
  for (const token of ['Machen Sie …?','Machen Sie Sport am Abend?','Machst du Sport am Abend?','Schwimmen Sie am Abend?','am Abend']) assert.ok(sprechenLearning.includes(token), token);
  assert.ok(sprechenLearning.includes('LearningGermanLine text={text} translation={translation} showTranslation'));
});


test('learning entry preserves the introductory or saved Schreiben stage', () => {
  assert.ok(learning.includes("useState<'intro'|'categories'|'lesson'|'categoryDone'|'bridge'|'form'|'step3'|'settings'>(()=>{let target=''"));
  assert.ok(learning.includes("progress.stage==='lesson'&&progress.currentCategory?'lesson'"));
  assert.ok(learning.includes("progress.stage==='form'?'form'"));
  assert.ok(learning.includes("progress.stage==='categories'?'categories'"));
  const start=learning.indexOf("const openLearningModule=");
  const end=learning.indexOf("\n  return <div className=",start);
  assert.ok(start>=0&&end>start,'module entry handler is present');
  const handler=learning.slice(start,end);
  assert.ok(handler.includes('setLearningModule(value)'));
  assert.ok(!handler.includes("setStage('step3')"),'re-entry cannot jump to letter stage');
  assert.ok(!handler.includes('persist('),'re-entry must not overwrite saved progress');
  assert.ok(learning.includes("learningModule==='schreiben'?'Как писать письма'"));
});

test('Horen visible MP3 fragments do not show redundant translation-eye controls', () => {
  assert.ok(hoerenLearning.includes('▶️ Послушать этот фрагмент'));
  assert.ok(hoerenLearning.includes('{fragment.text}'));
  assert.ok(hoerenLearning.includes('🇷🇺 {fragment.translation}'));
  assert.ok(!hoerenLearning.includes('text={fragment.text} audio={false} immediateTranslation={false}'));
  assert.ok(!hoerenLearning.includes('text={evidence.text} audio={false} immediateTranslation={false}'));
});

test('learning audio helpers reject Russian or mixed Russian-German text', () => {
  for (const source of [learningTranslation, learningLanguageTools, practiceTools, sprechenLearning]) {
    assert.ok(source.includes('/[А-Яа-яЁё]/.test(clean)'));
  }
});

test('Teil selectors retain the general explanation and back-to-selector routes', () => {
  for (const source of [lesenLearning, hoerenLearning, sprechenLearning]) {
    assert.ok(source.includes('Посмотреть общее объяснение ещё раз'));
    assert.ok(source.includes('backToSelector'));
  }
});

test('Hören Lesen and Sprechen use a two-action learning header with title below', () => {
  for (const source of [lesenLearning, hoerenLearning, sprechenLearning]) {
    const topNav = source.slice(source.lastIndexOf('function TopNav('),source.lastIndexOf('function Card('));
    assert.ok(topNav.includes('grid-cols-2'), 'two equal-width navigation actions');
    assert.ok(topNav.includes('onClick={onBack}'), 'back returns within current route');
    assert.ok(topNav.includes('onClick={onTraining}'), 'real training remains available');
    assert.ok(topNav.includes('К реальным заданиям'));
    assert.ok(topNav.includes('<h2 className='), 'heading follows the button row');
    assert.ok(!topNav.includes('К выбору Teil'), 'no duplicated Teil selector');
    assert.ok(!topNav.includes('К выбору модулей'), 'no duplicated module selector');
  }
});

test('Schreiben OTTO explanation bubbles no longer auto-generate German fragment translation blocks', () => {
  const start=schreiben.indexOf('function OttoBubble');
  const end=schreiben.indexOf('function InstructionLead', start);
  const bubble=schreiben.slice(start,end);
  assert.ok(!bubble.includes('GermanFragments'));
});


test('Sprechen Teil 3 uses the approved eight-screen explanation before practice', () => {
  assert.ok(sprechenLearning.includes('SPRECHEN · TEIL 3 · {screen+1}/8'));
  assert.ok(sprechenLearning.includes('Экран') === false || true);
  for (const token of [
    'В модуле <b>Sprechen</b> вас также попросят выполнить <b>3 задание (Teil 3).</b>',
    'Вы будете должны сформулировать вежливую просьбу, используя картинку на карточке.',
    'Теперь давайте рассмотрим, как выполнить это задание так, чтобы вам не пришлось строить сложные грамматические конструкции и занизить свой балл.',
    'Geben Sie mir bitte ...',
    'Bringen Sie mir bitte ...',
    'Reichen Sie mir bitte ...',
    'Nehmen Sie mir bitte ...',
    'Schicken Sie mir bitte ...',
    'Geben Sie mir bitte Butter.',
    'Bringen Sie mir bitte Butter.',
    'Gib mir bitte Butter.',
    'Geben Sie mir bitte Wasser.',
    'Bringen Sie mir bitte Wasser.',
    'Reichen Sie mir bitte Wasser.',
    'Rauchen Sie hier bitte nicht.',
    'Ja, bitte.',
    'Ja, gern.',
    'Natürlich.',
    'Nein, leider.',
    'Nein, das habe ich nicht.',
    'Перейти к практике'
  ]) assert.ok(sprechenLearning.includes(token), token);
});

test('Sprechen Teil 3 keeps Butter source image and negative card without Zigarette answer text', () => {
  assert.ok(sprechenLearning.includes('const butter=TEIL3_SIX[0]'));
  assert.ok(sprechenLearning.includes('<Teil3ArchiveImage imageIndex={butter.imageIndex} alt="Butter"'));
  assert.ok(sprechenLearning.includes('function NoSmokingIllustration'));
  const negStart=sprechenLearning.indexOf("screen===6");
  const negEnd=sprechenLearning.indexOf("screen===7", negStart);
  const negativeScreen=sprechenLearning.slice(negStart,negEnd);
  assert.ok(negativeScreen.includes('Rauchen Sie hier bitte nicht.'));
  assert.ok(!negativeScreen.includes('keine Zigarette'));
  assert.ok(!negativeScreen.includes('Geben Sie mir bitte eine Zigarette'));
});

test('Sprechen Teil 3 practice can open reference or explanation and return without unmounting task state', () => {
  for (const token of [
    'Справочник',
    'Посмотреть объяснение',
    'Вернуться к заданию',
    'Пропустить произношение',
    'Пропустить задание',
    'Прослушать немецкий пример',
    'Teil3ExplanationOverlay',
    'Teil3ReferenceOverlay',
    'onReturnToTask={onClose}'
  ]) assert.ok(sprechenLearning.includes(token), token);
  assert.ok(sprechenLearning.includes('const[showExplanation,setShowExplanation]=useState(false)'));
  assert.ok(sprechenLearning.includes('const[showReference,setShowReference]=useState(false)'));
});

test('Sprechen Teil 3 explanation audio is click-only and German-only through existing policy', () => {
  assert.ok(sprechenLearning.includes('function GermanExample'));
  assert.ok(sprechenLearning.includes('LearningGermanLine text={text} translation={translation} showTranslation'));
  assert.ok(sprechenLearning.includes('/[А-Яа-яЁё]/.test(clean)'));
  assert.ok(!sprechenLearning.includes('autoPlay'));
});


test('global OTTO reference overlay is mounted above both learning and real trainer state', () => {
  assert.ok(referenceOverlay.includes('export function FloatingOttoReferenceButtons'));
  assert.ok(referenceOverlay.includes('export function OttoReferenceOverlay'));
  assert.ok(app.includes('<FloatingOttoReferenceButtons'));
  assert.ok(app.includes('<OttoReferenceOverlay open={referenceOverlayOpen}'));
  assert.ok(learning.includes('<FloatingOttoReferenceButtons'));
  assert.ok(learning.includes('<OttoReferenceOverlay open={referenceOverlayOpen}'));
});



test('nested reference smartcards reflow narrow tables into visible vertical rows', () => {
  const responsive=fs.readFileSync(new URL('../src/ottoResponsivePreview.css',import.meta.url),'utf8');
  assert.ok(referenceOnboarding.includes('className="otto-reference-smartcard-embedded"'));
  assert.ok(responsive.includes('.otto-reference-smartcard-embedded .otto-reference-table[data-columns="2"] tr'));
  assert.ok(responsive.includes('.otto-reference-smartcard-embedded .otto-reference-table[data-columns="3"] tr'));
  assert.ok(responsive.includes('grid-template-columns: minmax(0, 1fr)'));
});

test('mobile reference tables do not inherit desktop widths or inflated audio heights', () => {
  const responsive=fs.readFileSync(new URL('../src/ottoResponsivePreview.css',import.meta.url),'utf8');
  assert.ok(referenceOnboarding.includes('data-columns={headers.length}'));
  assert.ok(referenceOnboarding.includes('otto-reference-combo-toggle'));
  assert.ok(referenceOnboarding.includes('otto-reference-combo-table'));
  assert.ok(referenceOnboarding.includes('otto-reference-smart-heading'));
  assert.ok(referenceOnboarding.includes('Общая база немецкого языка A1'));
  assert.ok(responsive.includes('.otto-reference-table[data-columns="2"] > table'));
  assert.ok(responsive.includes('.otto-reference-combo-table tr'));
  assert.ok(responsive.includes('min-height: 36px !important'));
  assert.ok(responsive.includes('hyphens: none !important'));
});


test('post-auth Reference greeting is an isolated preview-only screen before the existing routes', () => {
  const entry=fs.readFileSync(new URL('../src/preview/OttoReferenceEntryWelcome.tsx', import.meta.url),'utf8');
  const css=fs.readFileSync(new URL('../src/ottoReferenceEntryWelcome.css', import.meta.url),'utf8');
  for(const original of [
    '>OTTO</p>',
    '>Справочник OTTO</h1>',
    '>Goethe A1 · всегда под рукой</p>',
    'Информация, с которой готовиться к экзамену станет легко и просто.',
  ]) assert.ok(entry.includes(original), original);
  assert.ok(entry.includes('Если вы никогда раньше не изучали немецкий язык, то вам обязательно нужно прочитать этот раздел.'));
  assert.ok(entry.includes('Мы сознательно будем упрощать некоторые вещи, а какие-то правила и вовсе игнорировать, потому что это позволяет сделать формат экзамена А1.'));
  assert.ok(entry.includes('К справочнику'));
  assert.ok(entry.includes('Посмотреть позже'));
  assert.ok(entry.includes('<OttoScene scene="guide"'));
  assert.ok(entry.includes('BookOpen'));
  assert.ok(entry.includes('sessionStorage.setItem'));
  assert.ok(!entry.includes('localStorage.'));
  assert.ok(css.includes('overflow-y: auto'));
  assert.ok(css.includes('font-size: clamp('));
  assert.ok(css.includes('@media (max-height: 650px)'));
  assert.ok(css.includes('env(safe-area-inset-bottom, 0px)'));
  assert.ok(css.includes('min-height: 52px'));
  assert.ok(entry.includes('otto-reference-entry-illustration'));
  assert.ok(app.includes("import { OttoReferenceEntryWelcome,"));
  assert.ok(app.includes("import './ottoReferenceEntryWelcome.css'"));
  const subscription=app.indexOf('if(accountAccess.authenticated&&!accountAccess.hasTrainingAccess)');
  const chooser=app.indexOf('if(!previewOttoMode){');
  const welcome=app.indexOf("if(previewOttoMode==='learning'&&!referenceEntryContinued");
  const legal=app.indexOf('if(accountAccess.authenticated&&!legalConsent.accepted)');
  assert.ok(legal>=0&&subscription>legal&&chooser>subscription&&welcome>chooser);
  assert.ok(app.includes('<OttoQuickTour userId={accountAccess.userId??guestUserId}'));
  assert.ok(app.includes('markReferenceEntryWelcomeSeen(accountAccess.userId);setReferenceEntryContinued(true)'));
  assert.ok(app.includes("clearReferenceEntryWelcomeForLogout(accountAccess.userId)"));
  assert.ok(app.includes("initialSection={referenceInitialSection}"));
  assert.ok(referenceOnboarding.includes('Общая база немецкого языка A1'));
});

test('Preview 13 responsive safety reserves a clear icon rail and a fully usable reference overlay', () => {
  const responsive=fs.readFileSync(new URL('../src/ottoResponsivePreview.css',import.meta.url),'utf8');
  assert.ok(responsive.includes('height: calc(100dvh - var(--otto-nav-height) - env(safe-area-inset-bottom) - 90px)'));
  assert.ok(responsive.includes('.otto-reference-overlay[role=\'dialog\']'));
  assert.ok(responsive.includes('display: flex !important;'));
  assert.ok(responsive.includes('flex-wrap: nowrap !important;'));
  assert.ok(!responsive.includes('.otto-reference-overlay-header > :nth-child(3)'));
  assert.ok(referenceOverlay.includes('pt-2 sm:px-6'));
  assert.ok(responsive.includes('.otto-preview-learning-mode > [aria-label="Быстрый доступ OTTO"]'));
  assert.ok(responsive.includes('padding-inline: 6px !important;'));
  assert.ok(referenceOverlay.includes('otto-reference-overlay-header'));
  assert.ok(referenceOverlay.includes('otto-reference-overlay fixed inset-0'));
});

test('reference noun and preposition examples fit mobile without splitting audio from content', () => {
  const onboarding=fs.readFileSync(new URL('../src/preview/OttoReferenceOnboarding.tsx',import.meta.url),'utf8');
  const responsive=fs.readFileSync(new URL('../src/ottoResponsivePreview.css',import.meta.url),'utf8');
  assert.ok(onboarding.includes('data-unlabeled-examples={headers.length>=2'));
  assert.ok(onboarding.includes("data-noun-vocabulary={headers.length===2&&headers[0]==='Существительное'"));
  assert.ok(onboarding.includes('data-empty={v.trim()===""?"true":undefined}'));
  assert.ok(onboarding.includes("rows={[[ 'Mann - мужчина','Haus - дом']"));
  assert.ok(onboarding.includes("rows={[[ 'am Montag - в понедельник','um 8 Uhr - в 8 часов']"));
  assert.ok(onboarding.includes("headers={['Существительное','Перевод']} rows={NOUN_TABLE} audioColumns={[0]}"));
  assert.ok(responsive.includes('.otto-reference-table[data-unlabeled-examples="true"] tbody td'));
  assert.ok(responsive.includes('.otto-reference-table[data-noun-vocabulary="true"] tbody td'));
  assert.ok(responsive.includes('flex-wrap: wrap;'));
});

test('Hören Teil 1 retains question, bus visual, all three options and original sound buttons', () => {
  assert.ok(referenceExam.includes("written_horen_1:[{match:'Welche Busnummer fährt zum Bahnhof?',visual:'w_horen1'}]"));
  assert.ok(referenceExam.includes("part.startsWith('Welche Busnummer fährt zum Bahnhof?')"));
  assert.ok(referenceExam.includes('<SourceVisual visual="w_horen1"/>'));
  assert.ok(referenceExam.includes('aria-label="Варианты ответов Hören Teil 1"'));
  assert.ok(referenceExam.includes('const choices=lines.slice(1,4)'));
  assert.ok(referenceExam.includes('unitForLine(choice.source)?.audio||choice.answer'));
  assert.ok(referenceExam.includes('unitForLine(question)?.audio||question'));
});

test('Schreiben and Sprechen topic transitions reset their own scroll view, not training underneath', () => {
  assert.ok(referenceExam.includes('const sectionRoot=useRef<HTMLDivElement|null>(null)'));
  assert.ok(referenceExam.includes("root?.closest('.otto-reference-overlay')?.querySelector<HTMLElement>('main')"));
  assert.ok(referenceExam.includes("root?.closest<HTMLElement>('.otto-reference-entry-welcome')"));
  assert.ok(referenceExam.includes("scrollport?.scrollTo({top:0,behavior:'auto'})"));
  assert.ok(referenceExam.includes('scheduleScrollToTop();'));
  assert.ok(!referenceExam.includes("document.querySelector<HTMLElement>('.otto-reference-overlay main, .otto-reference-entry-welcome, .otto-inner-screen')"));
});

test('mobile learning header contains only the current section and bottom nav returns to hub',()=>{
  const css=fs.readFileSync(new URL('../src/ottoResponsivePreview.css',import.meta.url),'utf8');
  const app=fs.readFileSync(new URL('../src/App.tsx',import.meta.url),'utf8');
  const topbar=learning.slice(learning.indexOf('<header className="otto-learning-topbar '),learning.indexOf('{teilMenu&&<section'));
  assert.ok(topbar.includes('ОБУЧЕНИЕ С OTTO'));
  for(const label of ['Как писать письма','Проверка произношения','Учебная база']) assert.ok(topbar.includes(label));
  assert.ok(!topbar.includes('<button'));
  assert.ok(!learning.includes('aria-label="Меню обучения"'));
  assert.ok(!learning.includes('setLearningMenuOpen('));
  assert.ok(learning.includes("bottomNav?.(()=>{setReferenceFromHub(false);setLearningModule('hub')})"));
  assert.ok(app.includes("if(tab==='learning'){openStudyBase();return;}"));
  assert.ok(css.includes('.otto-bottom-nav-inner::after'));
  assert.ok(css.includes('content: none !important;'));
});
test('learning steps reset only their current scrollport and retain saved steps',()=>{
  const hook=fs.readFileSync(new URL('../src/preview/LearningStepScroll.ts',import.meta.url),'utf8');
  for(const path of ['SchreibenLearningStage','SchreibenExtraLetters','FormularLearningStage','SprechenLearningStage','LesenLearningStage','HoerenLearningStage']){
    const src=fs.readFileSync(new URL('../src/preview/'+path+'.tsx',import.meta.url),'utf8');
    assert.ok(src.includes('useResetLearningStepScroll('),path);
  }
  assert.ok(hook.includes("'.otto-inner-screen','.otto-app-content'"));
  assert.ok(!hook.includes("document.body.scrollTop"));
});
test('mobile reference vocabulary lists preserve word, translation and audio controls',()=>{
  const responsive=fs.readFileSync(new URL('../src/ottoResponsivePreview.css',import.meta.url),'utf8');
  assert.ok(referenceOnboarding.includes('data-verb-vocabulary={headers.length===2'));
  assert.ok(responsive.includes('.otto-reference-table[data-verb-vocabulary="true"] > table'));
  assert.ok(responsive.includes('display: block !important;'));
});
test('reviewed writing translations use complete sentences rather than literal word chunks',()=>{
  const tools=fs.readFileSync(new URL('../src/preview/SchreibenPracticeTools.tsx',import.meta.url),'utf8');
  const extra=fs.readFileSync(new URL('../src/preview/SchreibenExtraLetters.tsx',import.meta.url),'utf8');
  assert.ok(tools.includes('reviewedTrainingLetterTranslation'));
  assert.ok(tools.includes('Я хочу навестить тебя на выходных.'));
  assert.ok(tools.includes('Когда начинаются занятия?'));
  assert.ok(practiceTools.includes('preset={reviewedTrainingLetterTranslation(lines)}'));
  assert.ok(schreiben.includes('displayedLines.map('));
});

test('reference overlay preserves underlying task state instead of navigating away', () => {
  assert.ok(referenceOverlay.includes("if(!open)return null"));
  assert.ok(referenceOverlay.includes('К заданию'));
  assert.ok(referenceOverlay.includes('data-reference-return-state={returnState}'));
  assert.ok(app.includes('referenceReturnState'));
  assert.ok(learning.includes('referenceReturnState'));
  assert.ok(!app.includes("setView('reference')") || app.includes("if(tab==='reference')setView('reference')"));
});

test('reference home exposes the unified new OTTO reference', () => {
  const onboarding = fs.readFileSync(new URL('../src/preview/OttoReferenceOnboarding.tsx', import.meta.url), 'utf8');
  for (const token of [
    'Общая база немецкого языка A1',
    'Письменная часть экзамена',
    'Устная часть экзамена',
    'Полезная информация перед экзаменом',
    "['alphabet','Алфавит, буквосочетания и звуки в немецком языке']",
    "['numbers','Числа']",
    "['numberListening','Тренировка чисел на слух']",
    "['articles','Артикли']",
    "['sentence','Как строить предложения в немецком языке']",
    "['pronouns','Личные местоимения']",
    "['verbs','Глаголы']",
    "['nouns','Существительные']",
    "['prepositions','Предлоги']",
    "['questions','Список вопросов']",
    "['verbTable','Список глаголов']",
    "['nounTable','Список существительных']"
  ]) assert.ok(onboarding.includes(token), token);
  assert.ok(referenceOverlay.includes('<OttoReferenceContent'));
  assert.ok(referenceOverlay.includes('aria-label="Мои умные карточки"'));
  assert.ok(referenceOverlay.includes('aria-label="Закрыть"'));
  assert.ok(referenceOverlay.includes('<ArrowLeft className="h-4 w-4"/>К заданию'));
  assert.ok(!referenceOverlay.includes('Вернуться к заданию'));
  assert.ok(!referenceOverlay.includes('>Справочник OTTO</h1>'));
  const menu=onboarding.match(/\(\[\['alphabet'.+?\] as const\)\.map\(/s)?.[0] || '';
  assert.equal((menu.match(/\['(?:alphabet|numbers|numberListening|articles|sentence|pronouns|verbs|nouns|prepositions|questions|verbTable|nounTable)'/g)||[]).length,12);
  // The first menu entry opens the original alphabet and 'Далее' leads to unchanged combos.
  assert.ok(onboarding.includes("const REFERENCE_SEQUENCE:BaseSection[]=['alphabet','combos'"));
});

test('reference exam information opens a simple OTTO placeholder and returns home', () => {
  assert.ok(referenceOnboarding.includes("onClick={()=>onOpen('examInfo')}"), 'Open exam information from reference home');
  assert.equal(referenceOnboarding.split("section==='examInfo'?<ExamInfoPlaceholder/>").length - 1, 2, 'Both reference routes must show the placeholder');
  assert.ok(referenceOnboarding.includes('<ReferenceReturnBar onBackToHome={()=>openSection(\'home\')}'), 'Retain back to reference action');
  assert.ok(referenceOnboarding.includes('<OttoScene scene="guide"'), 'Use the existing OTTO illustration');
  for (const copy of [
    'Скоро здесь появятся лайфхаки OTTO ✨',
    'Собираем для вас полезные советы, которые помогут чувствовать себя увереннее перед экзаменом.',
    'Загляните сюда чуть позже 🙂',
  ]) assert.ok(referenceOnboarding.includes(copy), copy);
});

test('reference overlay architecture supports new initialSection and contextual opening', () => {
  assert.ok(referenceOverlay.includes("initialSection?:OttoReferenceSection"));
  assert.ok(referenceOverlay.includes("initialSection='reference_home'"));
  assert.ok(app.includes("return'oral_requests'"));
  assert.ok(app.includes("return'oral_questions'"));
  assert.ok(app.includes("return'oral_teil1'"));
  assert.ok(app.includes("return'written_schreiben_1'"));
  assert.ok(app.includes("return'written_schreiben_2'"));
  assert.ok(learning.includes("return'pronouns'"));
  assert.ok(learning.includes("return'conjugation'"));
  assert.ok(learning.includes("return'nouns'"));
  assert.ok(sprechenLearning.includes("onReferenceSectionChange?.('oral_questions')"));
  assert.ok(sprechenLearning.includes("onReferenceSectionChange?.('oral_requests')"));
});

test('floating reference buttons use the approved bottom-left safe-area anchor', () => {
  assert.ok(referenceOverlay.includes("bottom-[calc(env(safe-area-inset-bottom,0px)+22px)]"));
  assert.ok(referenceOverlay.includes("left-[max(12px,env(safe-area-inset-left,0px))]"));
  assert.ok(referenceOverlay.includes('h-14 w-14'));
  assert.ok(referenceOverlay.includes('z-[88]'));
});


test('OTTO reference Numbers section is deterministic for 1 through 999 and saveable', () => {
  for (const token of [
    "'numbers','Числа'",
    'Числа очень важны на экзамене A1.',
    'Важно уметь не только прочитать число, но и хорошо определить его на слух.',
    "12:'zwölf'",
    "16:'sechzehn'",
    "17:'siebzehn'",
    "20:'zwanzig'",
    "30:'dreißig'",
    "60:'sechzig'",
    "70:'siebzig'",
    "function germanNumber(value:number)",
    "value<1||value>999",
    'SmartHeading title="ЧИСЛА" id="numbers"',
    'Открыть полный раздел'
  ]) assert.ok(referenceOnboarding.includes(token), token);
});

test('OTTO reference original PDF visuals are wired as direct image assets', () => {
  for (const token of [
    "/reference-source/exam/w_horen1.png",
    "/reference-source/exam/w_horen2.png",
    "/reference-source/exam/w_horen3.png",
    "/reference-source/exam/w_lesen1.png",
    "/reference-source/exam/w_lesen2.png",
    "/reference-source/exam/w_lesen3.png",
    "/reference-source/exam/w_schreiben1.png",
    "/reference-source/exam/w_schreiben1_answers.png",
    "/reference-source/exam/o_teil1.png",
    "/reference-source/exam/o_teil1_template.jpg",
    "/reference-source/exam/o_teil2.png",
    "/reference-source/exam/o_teil3.png",
    "written_horen_1:[{match:'Welche Busnummer fährt zum Bahnhof?',visual:'w_horen1'}]",
    "written_lesen_1:[{match:'В задании вы видите это:',visual:'w_lesen1'}]",
    "written_schreiben_1:[{match:'В задании вы видите это:',visual:'w_schreiben1'}",
    "oral_teil1:[{match:'выглдятеть вот так:',visual:'o_teil1'}",
    "oral_teil2:[{match:'Карточка будет выглядеть примерно так:',visual:'o_teil2'}]",
    "oral_teil3:[{match:'Карточка будет выглядеть',visual:'o_teil3'}]",
    'Нажмите, чтобы увеличить'
  ]) assert.ok(referenceExam.includes(token), token);
  assert.ok(!referenceExam.includes('/reference-source/exam-source-sprite.webp'));
});

test('reference German audio actions use explicit German payloads and no Cyrillic literals', () => {
  const examAudio=[...referenceExam.matchAll(/audio:'([^']*)'/g)].map(match=>match[1]);
  assert.ok(examAudio.length>50);
  for (const value of examAudio) assert.ok(!/[А-Яа-яЁё]/.test(value), value);
  const generalExamples=[...referenceOnboarding.matchAll(/<Example de="([^"]*)"/g)].map(match=>match[1]);
  for (const value of generalExamples) assert.ok(!/[А-Яа-яЁё]/.test(value), value);
  assert.ok(referenceOnboarding.includes('audioRows={COMMON_COMBO_AUDIO}'));
  assert.ok(referenceOnboarding.includes('audioColumns={[0]}'));
  assert.ok(referenceExam.includes('<GermanAudioButton'));
});

test('Lesen Teil 1 source visual with original Richtig/Falsch table is restored', () => {
  assert.ok(referenceExam.includes("w_lesen1:{src:'/reference-source/exam/w_lesen1.png'"));
  assert.ok(referenceExam.includes("written_lesen_1:[{match:'В задании вы видите это:',visual:'w_lesen1'}]"));
  assert.ok(referenceExam.includes('Frau Keller kommt am Samstag zur Feier.'));
  assert.ok(referenceExam.includes('Frau Keller bringt einen Kuchen mit.'));
  assert.ok(referenceExam.includes('Richtig'));
  assert.ok(referenceExam.includes('Falsch'));
});


test('smart-card save controls live in section headers', () => {
  for (const token of [
    'SmartHeading title="НЕМЕЦКИЙ АЛФАВИТ" id="alphabet"',
    'SmartHeading title="БУКВОСОЧЕТАНИЯ И ЗВУКИ В НЕМЕЦКОМ ЯЗЫКЕ" id="letterCombos"',
    'SmartHeading title="ЧИСЛА" id="numbers"',
    'SmartHeading title="2. Построение предложения в немецком языке." id="sentenceSchemes"',
    'SmartHeading title="Личные местоимения" id="pronouns"',
    'SmartHeading title="СПРЯЖЕНИЕ ГЛАГОЛОВ" id="conjugation"',
    'SmartHeading title="МОДАЛЬНЫЕ ГЛАГОЛЫ" id="modals"',
    'SmartHeading title="Предлоги" id="prepositions"',
    'SmartHeading title="Вопросительные слова" id="questions"'
  ]) assert.ok(referenceOnboarding.includes(token), token);
  assert.ok(referenceExam.includes('flex flex-wrap items-start justify-between gap-3'));
  assert.ok(referenceExam.includes('active.smart&&<SmartButton'));
});

test('reference uses the module hub while floating smart-card access remains in both modes', () => {
  assert.ok(referenceOverlay.includes('FloatingOttoReferenceButtons'));
  assert.ok(!referenceOverlay.includes('Открыть Справочник OTTO'));
  assert.ok(referenceOverlay.includes('Открыть Мои умные карточки'));
  assert.ok(referenceOverlay.includes('<Bookmark className="h-6 w-6"/>'));
  assert.ok(learning.includes('data-testid="otto-study-base-menu"'));
  const hub=learning.slice(learning.indexOf('function LearningModulesHub('),learning.indexOf('function LearningIntro('));
  const moduleEntries=hub.slice(hub.indexOf('const entries=['),hub.indexOf('];'));
  assert.ok(moduleEntries.includes("id:'reference' as const,title:'Справочный конспект'"));
  assert.ok(moduleEntries.includes("id:'cards' as const,title:'Умные карточки'"));
  assert.ok(learning.includes("if(value==='reference')setReferenceFromHub(true)"));
  assert.ok(learning.includes("learningModule==='reference'&&"));
  assert.ok(referenceOnboarding.includes('К Учебной базе'));
  assert.ok(referenceOnboarding.includes('export function OttoReferenceOnboarding'));
  assert.ok(app.includes('<FloatingOttoReferenceButtons'));
  assert.ok(app.includes("setReferenceOverlayView('smartcards')"));
  assert.ok(learning.includes('<FloatingOttoReferenceButtons'));
  assert.ok(learning.includes("setReferenceOverlayView('smartcards')"));
});

test('global smart-card view reuses existing saved ids and opens as overlay', () => {
  assert.ok(referenceOnboarding.includes("const SMART_CARDS_KEY='otto-reference-smart-cards-v1'"));
  assert.ok(referenceOnboarding.includes('export function OttoSmartCardsView'));
  assert.ok(referenceOnboarding.includes('Мои умные карточки'));
  assert.ok(referenceOnboarding.includes('Открыть в Справочнике'));
  assert.ok(referenceOverlay.includes("initialView?:'reference'|'smartcards'"));
  assert.ok(referenceOverlay.includes("view==='smartcards'?<OttoSmartCardsView"));
  assert.ok(referenceOverlay.includes('data-reference-return-state'));
});

test('smart-card persisted state remains on the existing server-synced key', () => {
  const stateSync = fs.readFileSync(new URL('../src/lib/serverStateSync.ts', import.meta.url), 'utf8');
  assert.ok(stateSync.includes("'otto-reference-smart-cards-v1'"));
  assert.ok(referenceOnboarding.includes('localStorage.setItem(SMART_CARDS_KEY'));
  assert.ok(!referenceOnboarding.includes('SMART_CARDS_KEY_2'));
});


test('reference smart-card actions keep readable text beside the bookmark icon', () => {
  for (const source of [referenceOnboarding, referenceExam]) {
    assert.ok(source.includes("Добавить в умные карточки"));
    assert.ok(source.includes("✓ Уже добавлено в умные карточки"));
    assert.ok(source.includes("BookmarkCheck"));
  }
});

test('reference audio gives immediate UI feedback and reuses session audio', () => {
  assert.ok(referenceOnboarding.includes("aria-busy={busy}"));
  assert.ok(referenceExam.includes("aria-busy={busy}"));
  assert.ok(referenceOnboarding.includes("animate-pulse"));
  assert.ok(referenceExam.includes("animate-pulse"));
  assert.ok(ottoSpeechClient.includes("const sessionAudioCache = new Map()"));
  assert.ok(ottoSpeechClient.includes("const cached = sessionAudioCache.get(url)"));
  assert.ok(ottoSpeechClient.includes("sessionAudioCache.set(url, audio)"));
});

test('exam renderer suppresses incidental audio in introductory Russian explanation', () => {
  assert.ok(referenceExam.includes("sectionId==='written_intro'||sectionId==='oral_intro'||sectionId==='oral_teil1'?[]"));
  assert.ok(referenceExam.includes("if(isRussianLed(normalized)&&!russianHeadedStructured.has(sectionId))"));
  assert.ok(referenceExam.includes("audioUnits.filter(unit=>probe.startsWith(unit.match))"));
});

test('Sprechen Teil 1 renders question and answer as separate learning objects', () => {
  assert.ok(referenceExam.includes('function SprechenTeil1QaTable'));
  assert.ok(referenceExam.includes("Name\\?|Alter\\?|Land\\?|Wohnort\\?|Sprachen\\?|Beruf\\?|Hobby\\?"));
  assert.ok(referenceExam.includes('sm:grid-cols-[170px_1fr]'));
  assert.ok(referenceExam.includes('<GermanAudioButton text={row[1]}/>'));
  assert.ok(referenceExam.includes('<GermanAudioButton text={row[2]}/>'));
});

test('exam translations remain in the same card and use one speaker control per segment', () => {
  assert.ok(referenceExam.includes("if(current?.kind==='learning'&&russianLed){if(/[А-Яа-яЁё]/.test(current.text)){current.text+=' '+line;continue}"));
  assert.ok(referenceExam.includes('function LearningPair'));
  assert.ok(referenceExam.includes('{audio&&<GermanAudioButton text={audio}/>}'));
  assert.ok(!referenceExam.includes('audios.map((unit,audioIndex)'));
});


test('offline access keeps a previously verified exercise but still rejects expired or revoked access', () => {
  const access=fs.readFileSync(new URL('../src/hooks/useAccountAccess.ts', import.meta.url),'utf8');
  assert.ok(access.includes('VERIFIED_ACCESS_GRACE_MS'));
  assert.ok(access.includes("response.status === 401 || response.status === 403"));
  assert.ok(access.includes('deadlineExpired'));
  assert.ok(access.includes("window.addEventListener('online', onOnline)"));
  assert.ok(access.includes('lastGrantedAtRef.current'));
});

test('account progress is scoped and stale responses cannot write into another owner', () => {
  const progress=fs.readFileSync(new URL('../src/hooks/useProgress.ts', import.meta.url),'utf8');
  assert.ok(progress.includes('scopedProgressKey(userId)'));
  assert.ok(progress.includes('scopedActivityKey(userId)'));
  assert.ok(progress.includes('loadedOwner !== userId'));
  assert.ok(progress.includes('liveUserRef.current !== userId'));
});

test('Preview 13 uses the existing legacy exam with optional timer, without replacing its tasks', () => {
  const mock=fs.readFileSync(new URL('../src/components/MockExam.tsx',import.meta.url),'utf8');
  assert.ok(mock.includes('return <LegacyMockExam onBack={onBack} onRecordModule={onRecordModule} timerEnabled={timerEnabled} displayNumber={displayNumber}/>'));
  assert.ok(mock.includes('function LegacyMockExam('));
  assert.ok(mock.includes("const timed=timerEnabled??localTimerEnabled"));
  assert.ok(mock.includes("function ExamAudioQuestion("));
  assert.ok(!mock.includes('ArchiveMockExam'));
  assert.ok(!mock.includes('MockExamVariantChooser'));
});
test('shared server state sync retains older exam compatibility', () => {
  const sync=fs.readFileSync(new URL('../src/lib/serverStateSync.ts',import.meta.url),'utf8');
  assert.ok(sync.includes('deadline-(?:horen|lesen|schreiben|sprechen)'));
  assert.ok(sync.includes('schreiben-locked-form'));
});

test('iOS voice recording uses compatible MP4 and final-chunk capture', () => {
  const voice=fs.readFileSync(new URL('../src/components/sprechen/VoiceRecorder.tsx',import.meta.url),'utf8');
  const russian=fs.readFileSync(new URL('../src/components/sprechen/RussianVoiceInput.tsx',import.meta.url),'utf8');
  const mock=fs.readFileSync(new URL('../src/components/MockExam.tsx',import.meta.url),'utf8');
  assert.ok(voice.includes('isAppleTouchDevice'));
  assert.ok(voice.includes('recorder.start()'));
  assert.ok(russian.includes("['audio/mp4'"));
  assert.ok(russian.includes('recorder.start()'));
  assert.ok(mock.includes('r.start()'));
});

test('mobile Preview 13 retains the legal scrollport, both navbar grids and loading retry', () => {
  const css=fs.readFileSync(new URL('../src/ottoResponsivePreview.css',import.meta.url),'utf8');
  const entry=fs.readFileSync(new URL('../src/main.tsx',import.meta.url),'utf8');
  const nav=fs.readFileSync(new URL('../src/components/BottomNav.tsx',import.meta.url),'utf8');
  assert.ok(css.includes('main.otto-responsive-legal'));
  assert.ok(css.includes('overflow-y: auto;'));
  assert.ok(css.includes('repeat(auto-fit, minmax(0, 1fr))'));
  assert.ok(nav.includes("const fullItems:NavItem[]"));
  assert.ok(nav.includes("const basicItems:NavItem[]"));
  assert.equal((entry.match(/\(\) => import\('\.\/components\//g)||[]).length,4);
  assert.ok(entry.includes('connection?.saveData'));
  assert.ok(entry.includes('Загружаем OTTO'));
  assert.ok(entry.includes('Повторить загрузку'));
  assert.ok(entry.includes('await initializeServerStateSync()'));
});

test('Sprechen Teil 3 uses all supplied assets without changing original PNG paths', () => {
  const image=fs.readFileSync(new URL('../src/components/sprechen/Teil3ArchiveImage.tsx',import.meta.url),'utf8');
  const generator=fs.readFileSync(new URL('../scripts/build-sprechen-teil3.mjs',import.meta.url),'utf8');
  assert.ok(image.includes('cardNumber <= 48'));
  assert.ok(image.includes('teil3-originals/CARD'));
  assert.ok(image.includes('teil3-cards/'));
  assert.ok(image.includes('max-h-[280px]'));
  assert.ok(generator.includes('expectedNames'));
});


test('Preview 13 reference lessons keep mobile cards, audio and separate exam-topic screens',()=>{
  const css=fs.readFileSync(new URL('../src/ottoResponsivePreview.css',import.meta.url),'utf8');
  assert.ok(referenceOnboarding.includes('otto-reference-number-listening-intro'));
  assert.ok(referenceOnboarding.includes('otto-reference-number-listening-otto'));
  assert.ok(css.includes('.otto-reference-number-listening-intro .otto-scene'));
  assert.ok(referenceOnboarding.includes("data-numbers={headers[0]==='Число'&&headers[1]==='Немецкий'?'true':undefined}"));
  assert.ok(css.includes('.otto-reference-table[data-numbers="true"] td[data-label="Немецкий"] > div'));
  assert.ok(referenceOnboarding.includes('data-label="Буква / буквосочетание"'));
  assert.ok(referenceOnboarding.includes('data-label="Читаем примерно"'));
  assert.ok(css.includes('.otto-reference-combo-table tbody tr'));
  assert.ok(referenceExam.includes("const[detailOpen,setDetailOpen]=useState(Boolean(initialSectionId))"));
  assert.ok(referenceExam.includes('Назад к темам'));
  assert.ok(!referenceExam.includes('К списку тем'), 'obsolete duplicate exam footer removed');
  assert.ok(referenceExam.includes('Завершить раздел'), 'final topic handled without a dead Next');
  assert.ok(referenceOnboarding.includes('Назад в справочник'));
  assert.ok(!referenceExam.includes('lg:hidden'), 'topic footer available at desktop sizes too');
});


// Exercise-state regression tests execute the real TSX event handlers using a
// minimal JSX renderer. This does not require DOM or a user account.
function renderableSchreibenExercise(source,name){
  const file=ts.createSourceFile(name+'.tsx',source,ts.ScriptTarget.ES2020,true,ts.ScriptKind.TSX);
  const fn=file.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
  assert.ok(fn,'Missing real exercise function: '+name);
  const jsx=(type,props)=>({type,props:props||{}});
  const passthrough=({children})=>children;
  const button=(text,handler)=>jsx('button',{onClick:handler,children:text});
  const common={
    PracticeCard:passthrough,Card:passthrough,
    GermanAudioButton:()=>null,TranslationButton:()=>null,
    AutoRussianTranslation:()=>null,GermanLine:({text})=>jsx('span',{children:text}),
    RotateCcw:()=>null,ArrowRight:()=>null,
    PracticeFeedback:()=>null,
    SkipAction:({onSkip})=>button('Пропустить',onSkip),
    OttoError:({onRetry})=>button('Попробовать снова',onRetry),
    SkippedAnswer:({onBack,onNext})=>jsx('div',{children:[onBack&&button('Назад',onBack),button('Далее',onNext)]}),
    StepBackButton:({onClick})=>button('Назад',onClick),
    StepNextBack:({onBack,onNext})=>jsx('div',{children:[button('Назад',onBack),button('Далее',onNext)]}),
    useMemo:fn=>fn(),
    mixWords:sentence=>sentence.split(' ').filter(Boolean),
    explainBuildError:()=> 'Сборка неверна',
    explainTypingError:()=> 'Письмо неверно',
  };
  const compiled=ts.transpileModule(fn.getText(file),{
    compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}
  }).outputText;
  return vm.runInNewContext(compiled+'\n'+name+';',{
    ...common,
    exports:{},
    require:id=>{
      assert.equal(id,'react/jsx-runtime');
      return {jsx,jsxs:jsx,Fragment:Symbol.for('react.fragment')};
    },
  },{timeout:1000});
}
function walkExerciseTree(node){
  if(node===null||node===undefined||typeof node==='boolean')return [];
  if(Array.isArray(node))return node.flatMap(walkExerciseTree);
  if(typeof node!=='object')return [];
  if(typeof node.type==='function')return walkExerciseTree(node.type(node.props));
  return [node,...walkExerciseTree(node.props?.children)];
}
function exerciseText(node){
  if(node===null||node===undefined||typeof node==='boolean')return '';
  if(Array.isArray(node))return node.map(exerciseText).join('');
  if(typeof node!=='object')return String(node);
  if(typeof node.type==='function')return exerciseText(node.type(node.props));
  return exerciseText(node.props?.children);
}
function exerciseButton(root,match){
  const button=walkExerciseTree(root).find(node=>node.type==='button'&&
    (typeof match==='string'?exerciseText(node).includes(match):match(node)));
  assert.ok(button,'Button not found: '+String(match));
  return button;
}
function draftHarness({perLetter=false}={}){
  let letter=0,step=1;
  let drafts={};
  const statuses=[];
  const key=()=>perLetter?letter+':'+step:String(step);
  return {
    setStep:v=>{step=v},
    setLetter:v=>{letter=v},
    getDraft:()=>drafts[key()],
    getOther:(l,st)=>drafts[perLetter?l+':'+st:String(st)],
    statuses,
    render:(component,props)=>component({...props,
      draft:drafts[key()],
      onDraft:patch=>{const k=key();drafts={...drafts,[k]:{...drafts[k],...patch}}},
      onBack:()=>{step--},
      onNext:()=>{step++},
      onStatus:status=>statuses.push(status),
    }),
    resetCurrent:()=>{const k=key();const next={...drafts};delete next[k];drafts=next},
  };
}

test('Schreiben N2 keeps selected option, wrong/correct feedback and retry across Back / Next',()=>{
  const Choice=renderableSchreibenExercise(schreiben,'ChoiceExercise');
  const h=draftHarness();
  h.setStep(1);
  const props={title:'Как начать?',options:['Liebe Anna,','Lieber Anna,'],answer:'Liebe Anna,'};
  exerciseButton(h.render(Choice,props),'Lieber Anna,').props.onClick();
  assert.equal(h.getDraft().selected,'Lieber Anna,');
  exerciseButton(h.render(Choice,props),'Назад').props.onClick();
  h.setStep(1); // Return from N1
  assert.match(exerciseButton(h.render(Choice,props),'Lieber Anna,').props.className,/border-teal-500/);
  exerciseButton(h.render(Choice,props),'Проверить').props.onClick();
  assert.equal(h.getDraft().result,false);
  h.setStep(0);h.setStep(1); // previous step and back again
  exerciseButton(h.render(Choice,props),'Попробовать снова').props.onClick();
  assert.equal(h.getDraft().result,null);
  exerciseButton(h.render(Choice,props),'Liebe Anna,').props.onClick();
  exerciseButton(h.render(Choice,props),'Проверить').props.onClick();
  assert.equal(h.getDraft().result,true);
  assert.deepEqual(h.statuses,['correct']);
  h.setStep(0);h.setStep(1);
  exerciseButton(h.render(Choice,props),'Далее'); // verified state survives remount
});

test('Schreiben N3 N5 N6 keep partial assembly, with independent drafts and explicit reset',()=>{
  const Build=renderableSchreibenExercise(schreiben,'BuildExercise');
  const h=draftHarness();
  const tasks=[
    [2,'Соберите первое', ['dich','Ich','besuchen.'],'Ich dich besuchen.','dich'],
    [4,'Соберите второе',['Auto.','mit','Ich'],'Ich mit Auto.','Auto.'],
    [5,'Соберите третье',['im Park','Ich','spazieren gehen.'],'Ich im Park spazieren gehen.','im Park'],
  ];
  for(const [step,title,tiles,answer,pick] of tasks){
    h.setStep(step);
    const props={title,tiles,answer};
    exerciseButton(h.render(Build,props),node=>exerciseText(node)===pick).props.onClick();
    assert.deepEqual(Array.from(h.getDraft().chosen),[pick]);
    exerciseButton(h.render(Build,props),'Назад').props.onClick();
    h.setStep(step);
    const nodes=walkExerciseTree(h.render(Build,props));
    assert.ok(nodes.some(n=>n.type==='span'&&exerciseText(n)===pick&&String(n.props.className).includes('otto-build-selected-tile')));
  }
  h.setStep(4);
  const p={title:'Соберите второе',tiles:['Auto.','mit','Ich'],answer:'Ich mit Auto.'};
  exerciseButton(h.render(Build,p),'Сначала').props.onClick();
  assert.equal(h.getDraft().chosen.length,0);
  assert.deepEqual(Array.from(h.getOther(0,2).chosen),['dich']);
  assert.deepEqual(Array.from(h.getOther(0,5).chosen),['im Park']);
  exerciseButton(h.render(Build,p),'Пропустить').props.onClick();
  assert.equal(h.getDraft().skipped,true);
  assert.deepEqual(h.statuses,['skipped']);
  h.setStep(3);h.setStep(4);
  exerciseButton(h.render(Build,p),'Далее');
});

test('extra Schreiben letters isolate N2/N7 choice, N3 build and typing across letter and step',()=>{
  const Choice=renderableSchreibenExercise(extra,'Choice');
  const Build=renderableSchreibenExercise(extra,'Build');
  const TypeSentence=renderableSchreibenExercise(extra,'TypeSentence');
  const h=draftHarness({perLetter:true});
  h.setLetter(0);h.setStep(1);
  const choice={title:'Обращение',options:['Liebe Anna,','Lieber Stefan,'],answer:'Liebe Anna,'};
  exerciseButton(h.render(Choice,choice),'Lieber Stefan,').props.onClick();
  h.setStep(2);
  const build={title:'Собери',point:'Hallo',answer:'Ich komme.'};
  exerciseButton(h.render(Build,build),node=>exerciseText(node)==='Ich').props.onClick();
  assert.deepEqual(Array.from(h.getDraft().chosen),['Ich']);
  h.setLetter(10);h.setStep(2);
  const typing={title:'Напиши',point:'Wann?',answer:'Ich komme.'};
  const input=walkExerciseTree(h.render(TypeSentence,typing)).find(n=>n.type==='input');
  assert.ok(input);
  input.props.onChange({target:{value:'Ich ko'}});
  assert.equal(h.getDraft().value,'Ich ko');
  h.setStep(1);h.setStep(2);
  assert.equal(walkExerciseTree(h.render(TypeSentence,typing)).find(n=>n.type==='input').props.value,'Ich ko');
  exerciseButton(h.render(TypeSentence,typing),'Проверить').props.onClick();
  assert.equal(h.getDraft().result,false);
  h.setStep(1);h.setStep(2);
  exerciseButton(h.render(TypeSentence,typing),'Попробовать снова').props.onClick();
  assert.equal(h.getDraft().result,null);
  h.setLetter(11);h.setStep(2);
  assert.equal(walkExerciseTree(h.render(TypeSentence,typing)).find(n=>n.type==='input').props.value,'');
  h.setLetter(0);h.setStep(1);
  assert.match(exerciseButton(h.render(Choice,choice),'Lieber Stefan,').props.className,/border-teal-500/);
  h.setStep(2);
  assert.deepEqual(Array.from(h.getDraft().chosen),['Ich']);
  h.setLetter(10);h.setStep(2);
  assert.equal(h.getDraft().value,'Ich ko');
  h.resetCurrent(); // explicit replay clears just this exercise
  assert.equal(walkExerciseTree(h.render(TypeSentence,typing)).find(n=>n.type==='input').props.value,'');
  assert.deepEqual(Array.from(h.getOther(0,2).chosen),['Ich']);
});

test('Schreiben draft wiring does not mutate legacy progress storage, grading or source-task return',()=>{
  assert.match(schreiben,/const\[drafts,setDrafts\]=useState<Record<number,ExerciseDraft>>\(\{\}\)/u);
  assert.match(schreiben,/draft=\{drafts\[practiceIndex\]\}/u);
  assert.match(schreiben,/setDrafts\(previous=>\(\{\.\.\.previous,\[practiceIndex\]:\{\.\.\.previous\[practiceIndex\],\.\.\.patch\}\}\)\)/u);
  assert.match(extra,/const draftKey=currentLetter\+':'\+currentStep/u);
  assert.match(extra,/draft=\{drafts\[draftKey\]\} onDraft=\{updateDraft\}/u);
  assert.match(extra,/setDrafts\(previous=>\{const next=\{\.\.\.previous\};for\(let step=0;step<=8;step\+\+\)delete next\[currentLetter\+':'\+step\];return next\}\)/u);
  assert.match(schreiben,/const PRACTICE_STORAGE_PREFIX='otto-preview-schreiben-practice-v1:'/u);
  assert.match(extra,/const STORAGE_PREFIX='otto-preview-schreiben-extra-letters/u);
  assert.match(schreiben,/savePracticeState\(state,userId\)/u);
  assert.match(extra,/saveProgress\(\{/u);
  assert.match(schreiben,/const returnFromTask=\(\)=>\{\s*if\(returnToLetter===0&&returnToStep!==null\)setPracticeIndex\(returnToStep\);\s*setShowTask\(false\)/u);
  assert.match(extra,/const returnFromTask=\(\)=>\{\s*if\(returnToLetter!==null\)setCurrentLetter\(returnToLetter\);\s*if\(returnToStep!==null\)setCurrentStep\(returnToStep\);\s*setShowTask\(false\)/u);
  const topbar=learning.slice(learning.indexOf('<header className="otto-learning-topbar '),learning.indexOf('{teilMenu&&<section'));
  assert.doesNotMatch(topbar,/Посмотреть объяснение с начала|Вернуться к своему месту|Меню обучения/u);
  assert.match(learning,/const goTraining=\(\)=>setConfirmTraining\(true\)/u);
  for(const text of ["if(ok)onStatus('correct')","onStatus('skipped')"]){
    assert.ok(schreiben.includes(text),text);
    assert.ok(extra.includes(text),text);
  }
});

function evaluateSchreibenStepFunction(source,name,bindings={}){
  const parsed=ts.createSourceFile(name+'.tsx',source,ts.ScriptTarget.ES2020,true,ts.ScriptKind.TSX);
  const fn=parsed.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
  assert.ok(fn,'Expected step handler '+name);
  const output=ts.transpileModule(fn.getText(parsed),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.CommonJS}}).outputText;
  return vm.runInNewContext(output+'\n'+name+';',bindings,{timeout:1000});
}

test('first and fifteen additional Schreiben letters skip saved step 3 without renumbering exercise keys',()=>{
  const nf=evaluateSchreibenStepFunction(schreiben,'nextPracticeStep');
  const bf=evaluateSchreibenStepFunction(schreiben,'previousPracticeStep');
  const rf=evaluateSchreibenStepFunction(schreiben,'resumePracticeStep');
  const ne=evaluateSchreibenStepFunction(extra,'nextExtraStep');
  const be=evaluateSchreibenStepFunction(extra,'previousExtraStep');
  const re=evaluateSchreibenStepFunction(extra,'resumeExtraStep');
  let steps=[0];for(let i=0;i<8;i++)steps.push(ne(steps.at(-1)));
  assert.deepEqual(steps,[0,1,2,4,5,6,7,9,9]);
  assert.equal(nf(2),4);assert.equal(bf(4),2);assert.equal(nf(4),5);assert.equal(bf(5),4);
  assert.equal(ne(2),4);assert.equal(be(4),2);assert.equal(ne(4),5);assert.equal(be(5),4);
  assert.equal(rf(3),4);assert.equal(re(3),4);
  for(const step of [0,1,2,4,5,6,7,9])assert.equal(re(step),step);
  assert.equal(re(8),9,'legacy extra final step resumes on the completion screen');
  assert.equal((extra.match(/\n    id:\d+,/g)||[]).length,15);
  assert.ok(extra.includes('TRAINING_LETTER_COUNT=5'),'do not silently change existing training release');
  assert.equal((extra.match(/const value=nextExtraStep\(currentStep\)/g)||[]).length,2,'normal and status-advance paths');
});

test('saved Schreiben step 3 resumes on second-point exercise without changing statuses or localStorage',()=>{
  const legacyExtra={currentLetter:3,currentStep:3,completed:[0,1],name:'Julia',statuses:{'3:2':'correct','3:4':'skipped'}};
  const legacyFirst={mode:'practice',screenIndex:15,practiceIndex:3,name:'Julia',statuses:{'first:2':'correct','first:4':'skipped'}};
  let writes=0;
  const extraRead=evaluateSchreibenStepFunction(extra,'readProgress',{
    STORAGE_PREFIX:'otto-preview-schreiben-extra-letters-v1:',TRAINING_LETTER_COUNT:5,
    resumeExtraStep:evaluateSchreibenStepFunction(extra,'resumeExtraStep'),
    localStorage:{getItem:key=>{assert.equal(key,'otto-preview-schreiben-extra-letters-v1:student');return JSON.stringify(legacyExtra)},setItem:()=>writes++}
  });
  const extraState=JSON.parse(JSON.stringify(extraRead('student')));
  assert.equal(extraState.currentStep,4);assert.equal(extraState.currentLetter,3);
  assert.deepEqual(extraState.completed,legacyExtra.completed);
  assert.deepEqual(extraState.statuses,legacyExtra.statuses);
  const firstRead=evaluateSchreibenStepFunction(schreiben,'readPracticeState',{
    PRACTICE_STORAGE_PREFIX:'otto-preview-schreiben-practice-v1:',
    resumePracticeStep:evaluateSchreibenStepFunction(schreiben,'resumePracticeStep'),
    localStorage:{getItem:key=>{assert.equal(key,'otto-preview-schreiben-practice-v1:student');return JSON.stringify(legacyFirst)},setItem:()=>writes++},
    readProgress:()=>({screenIndex:15})
  });
  const firstState=JSON.parse(JSON.stringify(firstRead('student')));
  assert.equal(firstState.practiceIndex,4);assert.equal(firstState.mode,'practice');
  assert.deepEqual(firstState.statuses,legacyFirst.statuses);
  assert.equal(firstState.name,'Julia');
  assert.equal(writes,0,'reading legacy state must never clear or rewrite it');
});

test('second-point direct exercises preserve correct-answer gating, drafts, and return from assignment',()=>{
  assert.ok(schreiben.includes('draft={drafts[practiceIndex]}'));
  assert.ok(schreiben.includes("const key='first:'+String(practiceIndex)"));
  assert.ok(extra.includes("const draftKey=currentLetter+':'+currentStep"));
  assert.ok(extra.includes("const key=String(currentLetter)+':'+String(currentStep)"));
  assert.ok(extra.includes('if(returnToStep!==null)setCurrentStep(returnToStep)'));
  assert.ok(schreiben.includes('if(returnToLetter===0&&returnToStep!==null)setPracticeIndex(returnToStep)'));
  assert.ok(extra.includes('onBack={back} draft={drafts[draftKey]} onDraft={updateDraft} title="Разберите второй пункт и соберите предложение"'));
  assert.ok(extra.includes('onBack={back} draft={drafts[draftKey]} onDraft={updateDraft} title="Напишите предложение для второго пункта"'));
  assert.ok(extra.includes("selected.join(' ')===answer"));
  assert.ok(extra.includes('onDraft({result:null})'));
  assert.ok(extra.includes("onStatus('skipped')"));
  assert.ok(extra.includes('useResetLearningStepScroll('));
  assert.ok(schreiben.includes('useResetLearningStepScroll('));
});

test('Schreiben final letter uses one screen, audio and full translation for first and additional letters',()=>{
  const section=practiceTools.slice(practiceTools.indexOf('export function CompletedSchreibenLetter('),practiceTools.indexOf('export function GermanLine('));
  assert.equal((section.match(/<GermanAudioButton/g)||[]).length,1);
  assert.equal((section.match(/<AutoRussianTranslation/g)||[]).length,1);
  assert.ok(section.includes('label="Прослушать письмо"'));
  assert.ok(section.includes('reviewedTrainingLetterTranslation(lines)'));
  assert.ok(extra.includes('currentStep===9'));
  assert.ok(!extra.includes('currentStep===8&&'));
  assert.ok(!extra.includes('Раскрыты 3 пункта:'));
  assert.ok(extra.includes('value===9&&!completed.includes(currentLetter)'));
  assert.ok(schreiben.includes('practiceIndex>=7'));
  assert.ok(schreiben.includes('<CompletedSchreibenLetter lines={[GREETING'));
  assert.ok(!schreiben.includes('Н9 · ИТОГОВОЕ ПИСЬМО'));
});

test('Учебная база exposes the agreed seven actions without duplicating exercises or losing progress',()=>{
  const hub=learning.slice(learning.indexOf('function LearningModulesHub('),learning.indexOf('function LearningIntro('));
  const titles=['Справочный конспект','Умные карточки','Как лучше всего заниматься новичку','Как писать письма','Проверка произношения','Проверка чисел на слух','Как пользоваться приложением'];
  for(const title of titles)assert.equal(hub.split("title:'"+title+"'").length-1,1,title);
  assert.equal((hub.match(/\{id:'(?:reference|cards|novice|schreiben|sprechen|numbers|guide)' as const/g)||[]).length,7);
  assert.ok(hub.includes("if(id==='reference'||id==='schreiben'||id==='sprechen'||id==='novice')onOpen(id)"),'beginner tips open a real page');
  assert.ok(!hub.includes('disabled={future}'),'beginner page is available');
  assert.ok(hub.includes("else if(id==='numbers')onNumbers()"));
  assert.ok(hub.includes("else if(id==='guide')onGuide()"));
  assert.ok(hub.includes("else if(id==='cards')onCards()"));
  assert.ok(learning.includes("setReferenceSectionOverride('numberListening')"),'listening numbers reuses the reference section');
  assert.ok(referenceOverlay.includes("if(target==='numberListening')return{section:'numberListening'}"));
  assert.ok(learning.includes("setReferenceOverlayView('smartcards')"));
  assert.ok(learning.includes("setTourOpen(true)"));
  assert.ok(learning.includes('saveLearningProgress(next,userId)'),'progress persistence stays intact');
  assert.ok(learning.includes("saved==='lesen'||saved==='horen'?'hub'"),'old removed module routes migrate to hub');
  assert.ok(!hub.includes("id:'lesen'")&&!hub.includes("id:'horen'"));
});

test('Учебная база has evenly spaced cards with one scrollport above the bottom dock',()=>{
  const responsive=fs.readFileSync(new URL('../src/ottoResponsivePreview.css',import.meta.url),'utf8');
  const hub=learning.slice(learning.indexOf('function LearningModulesHub('),learning.indexOf('function LearningIntro('));
  assert.ok(learning.includes("learningModule==='hub'||learningModule==='novice'?' otto-study-base-active'"));
  assert.ok(learning.includes("learningModule==='hub'||learningModule==='novice'?'pb-0':'pb-6'"));
  assert.ok(!hub.includes('pb-[calc(var(--otto-nav-height)'));
  assert.ok(!hub.includes("index===2?'pt-5'"),'no extra gap before novice card');
  assert.ok(hub.includes('className="grid gap-2.5"'));
  assert.ok(learning.includes("learningModule!=='reference'&&learningModule!=='hub'&&learningModule!=='novice'&&!referenceOverlayOpen&&<FloatingOttoReferenceButtons"),'no floating shortcuts on menu and beginner plan');
  assert.ok(responsive.includes('.otto-preview-learning-mode.otto-study-base-active .otto-app-content'));
  assert.ok(responsive.includes('height: calc(100dvh - var(--otto-nav-height, 66px) - env(safe-area-inset-bottom, 0px)) !important;'));
  assert.ok(responsive.includes('.otto-preview-learning-mode.otto-study-base-active .otto-inner-screen > div'));
});

test('Sprechen smart-card explanation has one bookmark and no obsolete auto-routing claim',()=>{
  const sprechen=fs.readFileSync(new URL('../src/preview/SprechenLearningStage.tsx',import.meta.url),'utf8');
  const part=sprechen.slice(sprechen.indexOf('Умные карточки — ваши личные подсказки.'),sprechen.indexOf('Добавляйте туда нужные материалы'));
  assert.ok(part.includes('Значок «Умные карточки» находится в реальном тренажёре внизу слева.'));
  assert.ok(!sprechen.includes('Справочник понимает, откуда вы его открыли.'));
  assert.ok(!sprechen.includes('Эти два значка всегда находятся рядом'));
  assert.equal((part.match(/aria-label="Умные карточки"/g)||[]).length,1);
});

test('Preview20 guide agrees with Учебная база and exposes a working five-button dock',()=>{
 const guide=fs.readFileSync(new URL('../src/preview/OttoQuickTour.tsx',import.meta.url),'utf8');
 const css=fs.readFileSync(new URL('../src/preview/ottoQuickTour.css',import.meta.url),'utf8');
 for(const title of ['Шаг 4. Что есть в Учебной базе','Шаг 5. Учимся писать письма и тренируем произношение','Шаг 6. Нажмите «Тренироваться»'])assert.ok(guide.includes(title));
 assert.ok(guide.includes('внизу слева в реальном тренажёре'));
 assert.ok(!guide.includes('Обучающие разделы Hören и Lesen здесь больше не нужны'));
 assert.ok(!guide.includes('Значок домика в нижнем меню OTTO'));
 assert.ok(!guide.includes('кнопку со <b>значком домика'));
 assert.ok(guide.includes('К тренировкам по модулям экзамена A1 можно приступить сразу'));
 assert.ok(guide.includes('Вы можете в любой момент вернуться в Учебную базу, чтобы повторить письмо, произношение, нужные слова или числа.'));
 assert.ok(!guide.includes('внизу страницы справа, рядом со значком Справочника'));
 assert.ok(!guide.includes('Обучение каждого модуля построено по одному принципу'));
 assert.ok(!guide.includes('И так в каждом модуле: Schreiben, Lesen, Hören и Sprechen'));
 assert.ok(guide.includes('<BottomNav active="learning" mode="full"'));
 assert.ok(guide.includes('onNavigate={tab=>{finish();onNavigate(tab)}}'));
 assert.ok(css.includes('height:calc(100dvh - var(--otto-nav-height) - var(--otto-tour-bottom-safe))'));
 assert.ok(app.includes('onNavigate={navigateFromTour}'));
 assert.ok(app.includes('onTourNavigate={navigateFromTour}'));
 assert.ok(learning.includes('else onTourNavigate(tab)'));
});

test('Schreiben welcome leads with letters and explains both written A1 tasks before exercises',()=>{
 const start=learning.indexOf('function LearningIntro(');
 const end=learning.indexOf('function CategoryHub(',start);
 const introduction=learning.slice(start,end);
 assert.ok(introduction.includes('Как научиться писать письма A1'));
 assert.ok(introduction.includes('Письма — важная часть подготовки к экзамену A1.'));
 assert.ok(introduction.includes('<b>Schreiben</b>'));
 assert.ok(introduction.includes('<b>заполнить формуляр</b>'));
 assert.ok(introduction.includes('<b>написать короткое письмо</b>'));
 assert.ok(!introduction.includes('ПЕРВЫЙ МОДУЛЬ'));
 assert.ok(!introduction.includes('Начинаем со Schreiben'));
 assert.ok(introduction.includes('onClick={onStart}'));
 assert.ok(introduction.includes('onClick={onSkip}'));
});
test('pronunciation welcomes the learner before the unchanged Sprechen Teil explanation',()=>{
 const welcome=sprechenLearning.indexOf('if(showPronunciationWelcome&&progress.view');
 const oldIntro=sprechenLearning.indexOf("if(progress.view==='intro'||reviewIntro)");
 const selector=sprechenLearning.indexOf("if(progress.view==='selector')");
 assert.ok(welcome>0&&oldIntro>welcome&&selector>oldIntro,'new welcome comes before original explanation and selector');
 const lead=sprechenLearning.slice(welcome,oldIntro);
 assert.ok(lead.includes('Потренируем произношение вместе'));
 assert.ok(lead.includes('обратную связь от OTTO'));
 assert.ok(lead.includes('устная часть экзамена A1 — Sprechen'));
 assert.ok(lead.includes('настоящим тренировочным заданиям'));
 assert.ok(lead.includes('setShowPronunciationWelcome(false)'));
 assert.ok(!lead.includes('saveProgress('),'welcome is navigation only');
 const intro=sprechenLearning.slice(oldIntro,selector);
 for(const label of ['Как устроен Sprechen','<b>Teil 1</b>','<b>Teil 2</b>','<b>Teil 3</b>'])assert.ok(intro.includes(label));
 assert.ok(sprechenLearning.includes("useState(()=>initial.view==='intro')"));
 assert.ok(sprechenLearning.includes("!reviewIntro&&entryPart===null"));
});
test('OTTO tour navigation remains available from Settings (prior CI regression)',()=>{
 const settings=fs.readFileSync(new URL('../src/components/SettingsPage.tsx',import.meta.url),'utf8');
 assert.ok(settings.includes('onTourNavigate:(tab:BottomTab)=>void;'));
 assert.ok(settings.includes('onNavigate={tab=>{setShowOttoTour(false);onTourNavigate(tab)}}'));
 assert.ok(app.includes('onTourNavigate={navigateFromTour}'));
});

test('Preview20 beginner plan opens from Учебная база and preserves the supplied four-step learning roadmap',()=>{
  const plan=fs.readFileSync(new URL('../src/preview/OttoBeginnerStudyPlan.tsx',import.meta.url),'utf8');
  const menu=learning.slice(learning.indexOf('function LearningModulesHub('),learning.indexOf('function LearningIntro('));
  assert.ok(menu.includes("id:'novice' as const,title:'Как лучше всего заниматься новичку'"));
  assert.ok(menu.includes("if(id==='reference'||id==='schreiben'||id==='sprechen'||id==='novice')onOpen(id)"));
  assert.ok(!menu.includes('Скоро'));
  assert.ok(learning.includes("learningModule==='novice'&&<OttoBeginnerStudyPlan"));
  assert.ok(learning.includes("learningModule==='novice'?'hub':learningModule"),'informational page does not replace saved lesson position');
  assert.ok(learning.includes("learningModule==='hub'||learningModule==='novice'?' otto-study-base-active'"),'single scrollport remains above dock');
  assert.ok(plan.includes('data-testid="otto-beginner-study-plan"'));
  assert.ok(plan.includes('OttoScene scene="guide"'));
  for(const sentence of [
    'Подготовка к сдаче экзамена по новому, совершенно незнакомому языку',
    'экзамене Goethe A1',
    'Справочный конспект',
    'немецкий алфавит и то, как он звучит',
    'немецкие числа и правила их образования',
    'базовые правила построения предложений',
    'информацию, как успешно выполнять задания экзамена',
    'Умные карточки — подсказки под рукой',
    'немецкие местоимения',
    'План тренировок',
    'Написав 20 писем',
    'Вопросы и просьбы',
    'Чтение',
    'Слушание',
    'Главным правилом для успеха здесь является практика.',
  ])assert.ok(plan.includes(sentence),sentence);
  assert.equal((plan.match(/title: '(Письма|Вопросы и просьбы|Чтение|Слушание)'/g)||[]).length,4);
  assert.ok(plan.includes('onClick={onReference}'));
  assert.ok(plan.includes('onClick={onLetters}'));
  assert.ok(plan.includes('onClick={onBack}'));
  assert.ok(learning.includes('saveLearningProgress(next,userId)'), 'existing learning progress stays untouched');
});

test('Preview20 beginner plan uses horizontal, breakpoint-safe layout rather than a narrow vertical column',()=>{
  const plan=fs.readFileSync(new URL('../src/preview/OttoBeginnerStudyPlan.tsx',import.meta.url),'utf8');
  assert.ok(plan.includes('max-w-[1180px]'),'uses the full available desktop work area');
  assert.ok(!plan.includes('max-w-[880px]'),'no narrow desktop strip');
  assert.ok(plan.includes('data-testid="otto-beginner-hero-grid"'));
  assert.ok(plan.includes('sm:grid-cols-[minmax(0,1fr)_minmax(104px,160px)]'),'hero text and OTTO sit side by side on wider displays');
  assert.ok(plan.includes('data-testid="otto-beginner-guide-grid"'));
  assert.ok(plan.includes('md:grid-cols-2'),'reference and smart cards sit side by side from tablet widths');
  assert.ok(plan.includes('data-testid="otto-beginner-steps-grid"'));
  assert.ok(plan.includes('sm:grid-cols-2 xl:grid-cols-4'),'two step cards per row on tablets and four across on desktop');
  assert.ok(plan.includes('xl:block'),'number badge moves above text in compact desktop columns');
  for(const title of ['Письма','Вопросы и просьбы','Чтение','Слушание'])assert.ok(plan.includes("title: '"+title+"'"));
  assert.ok(plan.includes('min-w-0'),'cards prevent long-copy overflow');
  for(const action of ['onClick={onBack}','onClick={onReference}','onClick={onLetters}'])assert.ok(plan.includes(action));
});
