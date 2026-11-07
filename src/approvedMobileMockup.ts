import p1 from './approved-mobile/p1';
import p2 from './approved-mobile/p2';
import p3 from './approved-mobile/p3';
import p4 from './approved-mobile/p4';
import p5 from './approved-mobile/p5';
import p6 from './approved-mobile/p6';
import p7 from './approved-mobile/p7';
import p8 from './approved-mobile/p8';

// p8 historically contains one stray trailing '='. Removing only that byte
// restores the exact approved WebP payload without changing the artwork.
export const APPROVED_MOBILE_MOCKUP = `data:image/webp;base64,${p1}${p2}${p3}${p4}${p5}${p6}${p7}${p8.slice(0, -1)}`;
