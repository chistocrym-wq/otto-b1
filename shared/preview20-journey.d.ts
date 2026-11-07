export const PREVIEW_HOST:string;
export const CONSENT_VERSION:string;
export const DETAIL_WINDOW_MS:number;
export function withinDetailWindow(startedAt:number,now?:number):boolean;
export const SCOPES:Record<string,string>;
export const AREAS:string[];
export const KINDS:string[];
export const OPS:string[];
export const ACTIONS:string[];
export const OUTCOMES:string[];
export const FEEDBACK:Record<string,string>;
export const CODES:string[];
export const LABELS:Record<string,string>;
export interface JourneyFrame {scope:string;area:string;view?:string|number;phase?:string|number;stage?:string|number;step?:string|number;mode?:string|number;part?:number;index?:number;blocker?:string}
export interface JourneyEvent {id:string;kind:string;at:string;frame?:JourneyFrame;section?:string;operation?:string;operationId?:string;action?:string;outcome?:string;code?:string;status?:number;ms?:number;choice?:string;comment?:string;receivedAt?:string;recovered?:boolean}
export interface VisitSummary {id:string;startedAt:string;lastReceivedAt:string;userId:string|null;verifiedAt:string|null;device:string;source:string;eventCount:number;capped:boolean;lastScreen:JourneyFrame|null;lastSection:string|null;lastEventAt:string|null;issues:number;ongoing:boolean;time:Record<string,number>;hasPractice:boolean;hasLearning:boolean;feedbackCount:number;events?:JourneyEvent[];problems?:JourneyEvent[]}
export function uuid(v:unknown):boolean;
export function userUuid(v:unknown):boolean;
export function visitId(v:unknown):boolean;
export function cleanFrame(v:unknown):JourneyFrame|null;
export function frameLabel(v:JourneyFrame|null):string;
export function cleanEvent(v:unknown,now?:number):JourneyEvent|null;
export function summarizeVisit(record:any,now?:number):VisitSummary;
