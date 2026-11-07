// Preview-only passive instrumentation. The original handlers and guards are kept.
// The hook receives only projected UI enums/numbers, never form or answer objects.
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

export const targets={
 'src/components/LegalGate.tsx':{scope:'LegalGate',area:'registration',priority:90,names:['LegalGate']},
 'src/components/SubscriptionPanel.tsx':{scope:'SubscriptionPanel',area:'app',priority:90,names:['SubscriptionPanel']},
 'src/App.tsx':{scope:'App',area:'app',priority:10,names:['App']},
 'src/components/Onboarding.tsx':{scope:'Onboarding',area:'registration',priority:90,names:['Onboarding']},
 'src/preview/TwoModeLearningPreview.tsx':{scope:'LearningModePreview',area:'learning',priority:30,names:['LearningModePreview','PreviewModeChooser']},
 'src/preview/OttoQuickTour.tsx':{scope:'OttoQuickTour',area:'app',priority:50,names:['OttoQuickTour']},
 'src/preview/OttoReferenceEntryWelcome.tsx':{scope:'OttoReferenceEntryWelcome',area:'reference',priority:45,names:['OttoReferenceEntryWelcome']},
 'src/components/OttoReferenceOverlay.tsx':{scope:'OttoReferenceOverlay',area:'reference',priority:110,names:['OttoReferenceOverlay']},
 'src/preview/OttoReferenceOnboarding.tsx':{scope:'OttoReferenceOnboarding',area:'reference',priority:55,names:['OttoReferenceOnboarding']},
 'src/preview/HoerenLearningStage.tsx':{scope:'HoerenLearningStage',area:'learning',priority:50,names:['HoerenLearningStage','DetailedHoeren','PracticeHoeren']},
 'src/preview/LesenLearningStage.tsx':{scope:'LesenLearningStage',area:'learning',priority:50,names:['LesenLearningStage']},
 'src/preview/SprechenLearningStage.tsx':{scope:'SprechenLearningStage',area:'learning',priority:50,names:['SprechenLearningStage']},
 'src/preview/SchreibenLearningStage.tsx':{scope:'SchreibenLearningStage',area:'learning',priority:50,names:['SchreibenLearningStage']},
 'src/preview/FormularLearningStage.tsx':{scope:'FormularLearningStage',area:'learning',priority:55,names:['FormularLearningStage']},
 'src/components/modules/ReadingModule.tsx':{scope:'ReadingModule',area:'practice',priority:50,names:['ReadingModule']},
 'src/components/modules/ListeningModule.tsx':{scope:'ListeningModule',area:'practice',priority:50,names:['ListeningModule']},
 'src/components/modules/WritingModule.tsx':{scope:'WritingModule',area:'practice',priority:50,names:['WritingModule']},
 'src/components/modules/SpeakingModule.tsx':{scope:'SpeakingModule',area:'practice',priority:50,names:['SpeakingModule']},
};
const operations={
 '/api/email-otp-request':'otp_request','/api/email-otp-verify':'otp_verify','/api/session':'session',
 '/api/user-profile':'profile','/api/account-access':'access','/api/legal-consent':'profile','/api/profile':'profile','/api/access-status':'access','/api/access':'access',
 '/api/state':'state','/api/progress':'progress','/api/otto-tts':'tts','/api/tts':'tts',
 '/api/assess-speech':'speech_check','/api/assess-writing':'writing_check',
 '/api/check-speech':'speech_check','/api/check-writing':'writing_check',
};
function bindings(node,set){
 if(ts.isIdentifier(node))set.add(node.text);
 else if(ts.isObjectBindingPattern(node)||ts.isArrayBindingPattern(node))
  for(const el of node.elements)if(ts.isBindingElement(el))bindings(el.name,set);
}
function hasReturn(node){
 if(ts.isFunctionLike(node))return false;
 if(ts.isReturnStatement(node))return true;
 let found=false;ts.forEachChild(node,n=>{if(hasReturn(n))found=true;});return found;
}
function staticText(node){
 if(ts.isJsxText(node))return node.text.replace(/\s+/g,' ').trim();
 if(ts.isJsxExpression(node)&&node.expression&&(ts.isStringLiteral(node.expression)||ts.isNoSubstitutionTemplateLiteral(node.expression)))return node.expression.text;
 if(ts.isJsxElement(node))return node.children.map(staticText).filter(Boolean).join(' ');
 return '';
}
function descriptor(name,available,area){
 const has=s=>available.has(s),read=(obj,field)=>has(obj)?`__ottoField(${obj},${JSON.stringify(field)})`:'undefined';
 const local=s=>has(s)?s:'undefined';
 const f={view:`${local('screen')} ?? ${local('view')} ?? ${read('progress','view')} ?? ${local('moduleLocation')}`,
  phase:`${local('phase')} ?? ${read('current','phase')} ?? ${read('progress','phase')}`,
  stage:`${local('stage')} ?? ${read('progress','stage')}`,
  step:`${local('step')} ?? ${local('section')}`,
  part:`${local('part')} ?? ${read('progress','part')}`,
  index:`${local('index')} ?? ${local('currentIndex')} ?? ${local('exerciseIndex')} ?? ${read('progress','currentExercise')} ?? ${read('current','practiceIndex')}`,
  mode:`${local('contactType')} ?? ${local('previewOttoMode')}`,
 };
 if(has('entryPart')){f.part=`entryPart ?? (${f.part})`;f.phase=`entryPart != null ? 'partIntro' : (${f.phase})`;}
 if(has('reviewIntro'))f.view=`reviewIntro ? 'intro' : (${f.view})`;
 if(name==='App'){
  f.view=`${local('profileReady')} === false || ${local('progressReady')} === false || ${local('accessReady')} === false ? 'loading' : ${local('accessCheckStatus')} === 'failed' ? 'access-failed' : ${local('profileLoadFailed')} === true ? 'profile-failed' : ${read('accountAccess','authenticated')} === false ? 'onboarding' : ${read('accountAccess','hasTrainingAccess')} === false ? 'access-ended' : ${local('previewOttoMode')} === 'learning' ? 'learning' : (${local('view')} ?? 'home')`;
 }
 if(name==='Onboarding'){
  f.phase=`${local('gmailAdviceOpen')} ? 'gmail-advice' : (${local('busy')} ?? undefined)`;
  f.blocker=`${local('step')} === 'profile' && ${local('canContinueProfile')} === false ? (${local('registrationConsentRequired')} === true && ${local('personalDataAccepted')} === false ? 'consent_required' : 'required_fields') : ${local('step')} === 'login' && ${local('loginValid')} === false ? 'invalid_email' : undefined`;
 }
 if(has('open'))f.enabled='open !== false';
 return '{'+Object.entries(f).map(([k,v])=>k+':('+v+')').join(',')+'}';
}
export function transformJourney(source,filename){
 const target=targets[filename];
 if(!filename.startsWith('src/')||filename.startsWith('src/analytics/')||filename.startsWith('src/admin/')||!(/\.[tj]sx?$/.test(filename)))return {code:source,catalog:{},observed:[],routeValues:[]};
 const file=ts.createSourceFile(filename,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const edits=[],catalog={},observed=[],routeValues=new Set();let headingIndex=0;
 function wrap(node,prefix){edits.push({at:node.getStart(file),text:prefix},{at:node.end,text:')'});}
 function walk(node){
  if(target&&ts.isStringLiteral(node)&&/^[A-Za-z][A-Za-z0-9_-]{0,45}$/.test(node.text))routeValues.add(node.text);
  if(target&&ts.isFunctionDeclaration(node)&&node.name&&node.body&&target.names.includes(node.name.text)){
   const name=node.name.text,available=new Set();for(const p of node.parameters)bindings(p.name,available);
   let at=node.body.end-1;
   for(const statement of node.body.statements){
    if(hasReturn(statement)){at=statement.getStart(file);break;}
    if(ts.isVariableStatement(statement))for(const declaration of statement.declarationList.declarations)bindings(declaration.name,available);
   }
   const priority=target.priority+(/^(Detailed|Practice)/.test(name)?5:0);
   edits.push({at,text:`\n__ottoObserve(${JSON.stringify(name)},${descriptor(name,available,target.area)},${JSON.stringify(target.area)},${priority});\n`});
   observed.push({name,priority});
  }
  if(target&&ts.isJsxElement(node)&&/^h[123]$/.test(node.openingElement.tagName.getText(file))){
   headingIndex++;const id=target.scope+'-'+node.pos;
   catalog[id]=node.children.map(staticText).filter(Boolean).join(' ').slice(0,140)||`Fragment ${headingIndex}`;
   const titleExpr=node.children.some(c=>ts.isJsxExpression(c)&&c.expression&&ts.isIdentifier(c.expression)&&c.expression.text==='title');
   const value=titleExpr?`{__ottoSection(${JSON.stringify(target.scope)},${JSON.stringify(id)},title)}`:JSON.stringify(id);
   edits.push({at:node.openingElement.tagName.end,text:' data-otto-j-section='+value});
  }
  if(target&&(ts.isJsxOpeningElement(node)||ts.isJsxSelfClosingElement(node))&&node.tagName.getText(file)==='Step'){
   const attr=node.attributes.properties.find(a=>ts.isJsxAttribute(a)&&a.name.getText(file)==='title');
   if(attr?.initializer&&ts.isStringLiteral(attr.initializer))catalog[target.scope+'-'+node.pos]=attr.initializer.text.slice(0,140);
  }
  if(ts.isCallExpression(node)){
   const expression=node.expression.getText(file);
   if(expression==='fetch'||expression==='window.fetch'){
    const arg=node.arguments[0];let endpoint=arg&&(ts.isStringLiteral(arg)||ts.isNoSubstitutionTemplateLiteral(arg))?arg.text:arg&&ts.isTemplateExpression(arg)?arg.head.text:'';
    let op=operations[endpoint.split('?')[0]];
    if(!op&&filename==='src/lib/accessClient.ts'&&arg&&ts.isCallExpression(arg)&&arg.expression.getText(file)==='sessionRequestUrl')op='session';
    if(op){
     let method='GET',options=node.arguments[1];
     if(options&&ts.isObjectLiteralExpression(options))for(const prop of options.properties)if(ts.isPropertyAssignment(prop)&&prop.name.getText(file)==='method'&&ts.isStringLiteral(prop.initializer))method=prop.initializer.text.toUpperCase();
     wrap(node,`__ottoFetch(${JSON.stringify(op)},${JSON.stringify(method)},()=>`);
    }
   }else if(/\.getUserMedia$/.test(expression))wrap(node,"__ottoAsync('microphone',()=>");
   else if(target&&ts.isPropertyAccessExpression(node.expression)&&node.expression.name.text==='play'&&node.arguments.length===0)wrap(node,"__ottoAsync('audio',()=>");
  }
  ts.forEachChild(node,walk);
 }
 walk(file);
 if(target&&!observed.some(o=>o.name===target.names[0]))throw Error('Preview20 scope missing: '+filename);
 if(!edits.length)return {code:source,catalog,observed,routeValues:[...routeValues]};
 let code=source;for(const e of edits.sort((a,b)=>b.at-a.at))code=code.slice(0,e.at)+e.text+code.slice(e.at);
 code="import {useJourneyScope as __ottoObserve,sectionId as __ottoSection,uiField as __ottoField,observeFetch as __ottoFetch,observeAsync as __ottoAsync} from '@/analytics/journeyClient';\n"+code;
 return {code,catalog,observed,routeValues:[...routeValues]};
}
export function preview20JourneyPlugin(){
 const enabled=process.env.OTTO_JOURNEY_QA==='1'||(process.env.CONTEXT==='deploy-preview'&&(process.env.REVIEW_ID==='20'||process.env.BRANCH==='preview/admin-journey-analytics-20261020'))||(process.env.CONTEXT==='production'&&process.env.VITE_OTTO_V20_PRODUCTION_APPROVED==='true'&&process.env.VITE_OTTO_V20_JOURNEY_ENABLED==='true'&&process.env.VITE_OTTO_V20_ADMIN_ENABLED==='true');
 const virtual='virtual:otto-journey-catalog',resolved='\0'+virtual;let root=process.cwd(),catalog={};
 return {name:'otto-preview20-journey',enforce:'pre',
  configResolved(config){root=config.root;const routes=new Set();if(enabled)for(const filename of Object.keys(targets)){
   const result=transformJourney(fs.readFileSync(path.join(root,filename),'utf8'),filename);Object.assign(catalog,result.catalog);for(const v of result.routeValues)routes.add(v);
  }[...routes].sort().forEach((v,i)=>{catalog['route-'+(10000+i)]=v;});},
  resolveId(id){if(id===virtual)return resolved;},load(id){if(id===resolved)return 'export default '+JSON.stringify(catalog)+';';},
  transform(source,id){
   if(!enabled)return null;const filename=path.relative(root,id.split('?')[0]).replaceAll(path.sep,'/');
   if(filename==='src/main.tsx'){
    if(!source.includes("import('./admin/ReadableAdmin')")||!source.includes('void startApp();'))throw Error('Preview20 entry changed; review instrumentation');
    return {code:"import {mountJourneyTools} from './analytics/JourneyTools';\n"+source.replace("import('./admin/ReadableAdmin')","import('./analytics/JourneyAdminShell')").replace('void startApp();','mountJourneyTools();\nvoid startApp();'),map:null};
   }
   const result=transformJourney(source,filename);return result.code!==source?{code:result.code,map:null}:null;
  },
 };
}
