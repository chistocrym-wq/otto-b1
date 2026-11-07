import { useState } from 'react';
const topics=[
 ['Порядок слов','В главном предложении глагол на второй позиции.','Heute fahre ich mit dem Zug.'],
 ['Придаточные с weil, dass, obwohl','Спрягаемый глагол идёт в конец придаточного.','Ich bleibe zu Hause, weil ich krank bin.'],
 ['Perfekt и Präteritum','Perfekt часто используется в разговоре, war и hatte часто в Präteritum.','Gestern habe ich viel gearbeitet. Früher hatte ich mehr Zeit.'],
 ['Konjunktiv II','Вежливость и нереальные ситуации: könnte, hätte, wäre, würde + Infinitiv.','Wenn ich Zeit hätte, würde ich mitkommen.'],
 ['Passiv','werden + Partizip II описывает действие; wurde + Partizip II — прошедшее.','Die Straße wird repariert.'],
 ['Relativsätze','Относительное местоимение зависит от рода/числа существительного и падежа в придаточном.','Das ist die Frau, die mir geholfen hat.'],
 ['Предлоги','mit, bei, nach, zu — Dativ; für, ohne, gegen — Akkusativ.','Ich fahre mit dem Bus zur Arbeit.'],
 ['Schreiben: письмо','Обращение, все пункты задания, связки и заключение.','Liebe Anna, vielen Dank für deine Nachricht.'],
 ['Schreiben: мнение','Позиция, аргумент, пример и вывод.','Meiner Meinung nach ist das sehr wichtig.'],
 ['Sprechen: планирование','Предлагайте идеи, реагируйте на предложения и договоритесь о решении.','Ich schlage vor, dass wir ... Was hältst du davon?'],
 ['Sprechen: презентация','Тема, личный опыт, ситуация в стране, преимущества, недостатки и вывод.','Heute möchte ich über das Thema ... sprechen.'],
 ['Полезные связки','Используйте deshalb, trotzdem, außerdem, einerseits, andererseits.','Es regnet. Trotzdem gehen wir spazieren.']
] as const;
export function B1Reference({onClose}:{onClose:()=>void}){
 const [term,setTerm]=useState('');
 const filtered=topics.filter(t=>t.join(' ').toLowerCase().includes(term.toLowerCase()));
 return <section className="rounded-2xl bg-white p-4 shadow-sm md:p-7">
  <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">Справочник OTTO B1</h2><button className="rounded-xl border p-3" onClick={onClose}>К заданиям</button></div>
  <label className="mt-4 block font-semibold">Поиск<input className="mt-2 w-full rounded-lg border p-3" value={term} onChange={e=>setTerm(e.target.value)} placeholder="Грамматика, Schreiben, Sprechen"/></label>
  <div className="mt-5 space-y-3">{filtered.map(([title,rule,example])=><article key={title} className="rounded-xl border p-4"><h3 className="font-bold text-teal-900">{title}</h3><p className="mt-2">{rule}</p><p lang="de" className="mt-2 rounded-lg bg-teal-50 p-3">{example}</p></article>)}</div>
  {!filtered.length&&<p className="mt-4">Ничего не найдено</p>}
 </section>;
}
