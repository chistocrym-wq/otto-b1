/** A navigation-only request must never imply task completion. */
export type LearningPart=1|2|3;
export type PartView='intro'|'selector'|'part';
export type LearningPartLocation={
  module:'lesen'|'horen'|'sprechen';
  view:PartView;
  part:LearningPart;
};
export type PartNavigationCommand=
  | {kind:'open';part:LearningPart}
  | {kind:'restore';view:PartView;part:LearningPart};
