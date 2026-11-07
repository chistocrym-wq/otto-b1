import type { SpeakingVisual } from '@/data/speaking';

interface SpeakingCardIllustrationProps {
  visual: SpeakingVisual;
  alt: string;
}

type SketchKind =
  | 'glass' | 'pen' | 'window' | 'door' | 'shaker' | 'menu' | 'phone' | 'key' | 'bag' | 'ticket'
  | 'map' | 'umbrella' | 'bread' | 'bottle' | 'chair' | 'lamp' | 'camera' | 'suitcase' | 'car' | 'building'
  | 'stamp' | 'shoes' | 'coins' | 'calendar' | 'train' | 'book' | 'newspaper' | 'card' | 'plate' | 'fork'
  | 'spoon' | 'coffee' | 'cup' | 'sandwich' | 'fruit' | 'pill' | 'towel' | 'glasses' | 'charger' | 'wifi'
  | 'clock' | 'bus' | 'bike' | 'jacket' | 'roomkey' | 'blanket' | 'soap' | 'toilet' | 'receipt';

const specs: Record<SpeakingVisual, { kind: SketchKind; label?: string }> = {
  water: { kind: 'glass' },
  pen: { kind: 'pen' },
  window: { kind: 'window' },
  door: { kind: 'door' },
  salt: { kind: 'shaker', label: 'SALZ' },
  menu: { kind: 'menu', label: 'MENÜ' },
  phone: { kind: 'phone' },
  key: { kind: 'key' },
  bag: { kind: 'bag' },
  ticket: { kind: 'ticket', label: 'TICKET' },
  map: { kind: 'map' },
  umbrella: { kind: 'umbrella' },
  bread: { kind: 'bread' },
  bottle: { kind: 'bottle' },
  chair: { kind: 'chair' },
  light: { kind: 'lamp' },
  photo: { kind: 'camera' },
  suitcase: { kind: 'suitcase' },
  taxi: { kind: 'car', label: 'TAXI' },
  post: { kind: 'building', label: 'POST' },
  stamp: { kind: 'stamp' },
  shoes: { kind: 'shoes' },
  coins: { kind: 'coins' },
  timetable: { kind: 'calendar', label: 'FAHRPLAN' },
  station: { kind: 'building', label: 'BAHNHOF' },
  book: { kind: 'book' },
  newspaper: { kind: 'newspaper', label: 'ZEITUNG' },
  car: { kind: 'car' },
  idcard: { kind: 'card', label: 'AUSWEIS' },
  plate: { kind: 'plate' },
  fork: { kind: 'fork' },
  spoon: { kind: 'spoon' },
  coffee: { kind: 'coffee' },
  cup: { kind: 'cup' },
  sandwich: { kind: 'sandwich' },
  fruit: { kind: 'fruit' },
  medicine: { kind: 'pill' },
  towel: { kind: 'towel' },
  glasses: { kind: 'glasses' },
  charger: { kind: 'charger' },
  wifi: { kind: 'wifi', label: 'WLAN' },
  clock: { kind: 'clock' },
  bus: { kind: 'bus' },
  bicycle: { kind: 'bike' },
  jacket: { kind: 'jacket' },
  roomkey: { kind: 'roomkey', label: '101' },
  blanket: { kind: 'blanket' },
  soap: { kind: 'soap' },
  toilet: { kind: 'toilet', label: 'WC' },
  receipt: { kind: 'receipt', label: 'RECHNUNG' },
};

export function SpeakingCardIllustration({ visual, alt }: SpeakingCardIllustrationProps) {
  const spec = specs[visual];
  const roughId = `rough-${visual}`;

  return (
    <svg
      viewBox="0 0 300 200"
      role="img"
      aria-label={alt}
      className="h-48 w-full sm:h-56"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <filter id={roughId} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="1" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.7" />
        </filter>
      </defs>
      <rect x="8" y="8" width="284" height="184" rx="14" fill="#fafafa" stroke="#d4d4d8" strokeWidth="2" />
      <g filter={`url(#${roughId})`} className="text-slate-800">
        {renderKind(spec.kind, spec.label)}
      </g>
      <path d="M36 173c42 3 77-1 116 1s76 0 111-2" stroke="#cbd5e1" strokeWidth="1.4" opacity=".8" />
    </svg>
  );
}

function label(text: string, x = 150, y = 105, size = 18) {
  return <text x={x} y={y} textAnchor="middle" fontSize={size} fontWeight="800" stroke="none" fill="currentColor">{text}</text>;
}

function renderKind(kind: SketchKind, text?: string) {
  switch (kind) {
    case 'glass': return <g><path d="M112 53h76l-9 93h-58z"/><path d="M120 102c18 7 38-7 58 0M122 121c18 6 35-5 54 0" strokeWidth="2.2"/></g>;
    case 'pen': return <g><path d="M82 137l19-7 105-78 14 20-105 78-22 2z"/><path d="M195 61l14 20M93 151l8-21"/></g>;
    case 'window': return <g><rect x="85" y="43" width="130" height="110"/><path d="M150 43v110M85 98h130M98 140l35-29M166 84l37-27"/></g>;
    case 'door': return <g><path d="M96 159V38h108v121"/><path d="M111 159V52h77v107"/><circle cx="174" cy="107" r="5" fill="currentColor"/></g>;
    case 'shaker': return <g><path d="M119 77h62l10 73h-82z"/><path d="M127 57h46l8 20h-62z"/><circle cx="139" cy="67" r="2" fill="currentColor"/><circle cx="151" cy="64" r="2" fill="currentColor"/><circle cx="163" cy="67" r="2" fill="currentColor"/>{text && label(text,150,121,17)}</g>;
    case 'menu': return <g><rect x="92" y="39" width="116" height="120" rx="7"/><path d="M111 78h77M111 96h77M111 114h55M111 132h68"/>{text && label(text,150,65,16)}</g>;
    case 'phone': return <g><rect x="116" y="31" width="68" height="132" rx="13"/><path d="M130 49h40"/><circle cx="150" cy="145" r="5"/><path d="M134 83c9-9 23-9 32 0M140 94c6-6 14-6 20 0"/></g>;
    case 'key': return <g><circle cx="112" cy="101" r="29"/><circle cx="112" cy="101" r="10"/><path d="M140 101h87M195 101v20M216 101v15"/></g>;
    case 'bag': return <g><path d="M87 78h126l-12 77H99z"/><path d="M117 80c0-30 66-30 66 0M110 105h80"/></g>;
    case 'ticket': return <g><path d="M74 63h152v74c-12 0-12 22 0 22H74c12 0 12-22 0-22z"/><path d="M114 66v90" strokeDasharray="7 7"/>{text && label(text,171,108,17)}</g>;
    case 'map': return <g><path d="M76 61l48-15 52 15 48-15v102l-48 15-52-15-48 15z"/><path d="M124 46v102M176 61v102M92 128c30-12 42-41 67-28s29-14 48-24"/></g>;
    case 'umbrella': return <g><path d="M65 103c12-59 158-59 170 0-16-12-31-12-46 0-13-12-26-12-39 0-13-12-26-12-39 0-15-12-30-12-46 0z"/><path d="M150 64v79c0 22 33 22 33 0"/></g>;
    case 'bread': return <g><path d="M82 127c0-47 28-74 68-74s68 27 68 74v27H82z"/><path d="M116 75l15 18M150 61l15 19M184 75l15 18"/></g>;
    case 'bottle': return <g><path d="M133 39h34v30l12 18v69h-58V87l12-18z"/><path d="M132 53h36M122 107h56M135 129h30"/></g>;
    case 'chair': return <g><path d="M101 54h98v61h-98zM94 115h112v21H94zM106 136v27M194 136v27"/></g>;
    case 'lamp': return <g><path d="M112 96l20-46h36l20 46zM150 96v44M119 145h62"/><path d="M150 31V20M101 53l-10-10M199 53l10-10"/></g>;
    case 'camera': return <g><rect x="78" y="72" width="144" height="84" rx="10"/><path d="M116 72l11-22h46l11 22"/><circle cx="150" cy="113" r="28"/><circle cx="150" cy="113" r="13"/><circle cx="198" cy="89" r="4" fill="currentColor"/></g>;
    case 'suitcase': return <g><rect x="76" y="76" width="148" height="79" rx="10"/><path d="M123 76V58h54v18M101 76v79M199 76v79M115 108h70"/><circle cx="101" cy="164" r="5" fill="currentColor"/><circle cx="199" cy="164" r="5" fill="currentColor"/></g>;
    case 'car': return <g><path d="M78 125l14-39 23-18h70l23 18 14 39v28H78z"/><path d="M107 91h86M96 127h108"/><circle cx="105" cy="151" r="10"/><circle cx="195" cy="151" r="10"/>{text && label(text,150,116,18)}</g>;
    case 'building': return <g><path d="M77 158V74h146v84M94 74l56-35 56 35"/><path d="M104 101h24v25h-24zM176 101h24v25h-24zM139 119h22v39"/>{text && label(text,150,92,16)}</g>;
    case 'stamp': return <g><path d="M99 62h102l10 10-10 10 10 10-10 10 10 10-10 10 10 10-10 10H99l-10-10 10-10-10-10 10-10-10-10 10-10-10-10z"/><path d="M124 84h52v46h-52z"/><circle cx="150" cy="105" r="12"/></g>;
    case 'shoes': return <g><path d="M77 132c30 0 42-32 47-52l28 20 26 24c9 8 3 25-10 25H92c-13 0-19-7-15-17z"/><path d="M151 129c26 0 32-27 36-45l28 17 18 17c9 9 3 26-10 26h-58"/></g>;
    case 'coins': return <g><ellipse cx="116" cy="122" rx="35" ry="14"/><ellipse cx="116" cy="108" rx="35" ry="14"/><ellipse cx="116" cy="94" rx="35" ry="14"/><circle cx="195" cy="108" r="28"/>{label('€',195,118,28)}</g>;
    case 'calendar': return <g><rect x="83" y="52" width="134" height="108" rx="5"/><path d="M83 82h134M112 42v22M188 42v22"/>{text && label(text,150,112,15)}<path d="M113 132h74"/></g>;
    case 'train': return <g><path d="M104 50h92c17 0 26 14 26 32v64H78V82c0-18 9-32 26-32z"/><path d="M95 84h110M102 119h96"/><circle cx="108" cy="145" r="9"/><circle cx="192" cy="145" r="9"/></g>;
    case 'book': return <g><path d="M70 61c32-10 57-4 80 13v87c-23-17-48-23-80-13z"/><path d="M230 61c-32-10-57-4-80 13v87c23-17 48-23 80-13zM150 74v87"/></g>;
    case 'newspaper': return <g><path d="M83 51h134v112H83z"/><path d="M101 75h98M101 91h43M101 108h98M101 124h98M101 140h75"/>{text && label(text,150,69,13)}</g>;
    case 'card': return <g><rect x="78" y="62" width="144" height="94" rx="9"/><circle cx="115" cy="105" r="17"/><path d="M96 140c8-19 31-19 39 0M148 94h53M148 111h53M148 128h40"/>{text && label(text,174,80,12)}</g>;
    case 'plate': return <g><ellipse cx="150" cy="108" rx="72" ry="52"/><ellipse cx="150" cy="108" rx="49" ry="34"/></g>;
    case 'fork': return <g><path d="M116 48v42M106 48v30M126 48v30M106 78c0 19 20 19 20 0M116 90v70"/></g>;
    case 'spoon': return <g><ellipse cx="160" cy="70" rx="21" ry="28"/><path d="M160 98v62"/></g>;
    case 'coffee': return <g><path d="M101 86h83v51c0 15-12 25-27 25h-29c-15 0-27-10-27-25zM184 96h14c24 0 24 35 0 35h-14"/><path d="M121 69c-12-15 10-18 0-33M151 69c-12-15 10-18 0-33"/></g>;
    case 'cup': return <g><path d="M104 83h78v54c0 15-12 24-26 24h-26c-14 0-26-9-26-24zM182 94h15c22 0 22 31 0 31h-15"/></g>;
    case 'sandwich': return <g><path d="M83 139l67-88 67 88z"/><path d="M98 120h104M112 103h76"/></g>;
    case 'fruit': return <g><circle cx="126" cy="112" r="38"/><path d="M124 74c2-20 18-29 30-28M128 72c-11-18-25-17-33-12"/><path d="M171 139c24-18 42-53 53-80"/><circle cx="190" cy="108" r="29"/></g>;
    case 'pill': return <g><path d="M104 124l61-61c15-15 40 10 25 25l-61 61c-15 15-40-10-25-25z"/><path d="M132 96l30 30"/><rect x="80" y="54" width="47" height="31" rx="5"/></g>;
    case 'towel': return <g><path d="M91 49h118v116H91z"/><path d="M91 77h118M111 49v116M189 49v116"/></g>;
    case 'glasses': return <g><circle cx="113" cy="110" r="32"/><circle cx="187" cy="110" r="32"/><path d="M145 105h10M81 101l-30-13M219 101l30-13"/></g>;
    case 'charger': return <g><rect x="104" y="70" width="58" height="70" rx="9"/><path d="M162 92h24v26h-24M186 98h17M186 112h17M133 140v22"/><path d="M127 92l16 13-16 13"/></g>;
    case 'wifi': return <g><path d="M87 91c38-35 88-35 126 0M108 113c25-23 59-23 84 0M132 136c11-10 25-10 36 0"/>{text && label(text,150,166,14)}</g>;
    case 'clock': return <g><circle cx="150" cy="105" r="63"/><path d="M150 105V66M150 105l36 21"/><path d="M150 48v10M150 152v10M93 105h10M197 105h10"/></g>;
    case 'bus': return <g><rect x="80" y="53" width="140" height="100" rx="12"/><path d="M94 72h112v43H94zM80 126h140"/><circle cx="108" cy="153" r="10"/><circle cx="192" cy="153" r="10"/></g>;
    case 'bike': return <g><circle cx="96" cy="130" r="35"/><circle cx="204" cy="130" r="35"/><path d="M96 130l42-62 28 62H96l29-39h48M138 68h26M166 130l22-62h24"/></g>;
    case 'jacket': return <g><path d="M113 51l37 16 37-16 32 31-26 29-14-13v64h-58V98l-14 13-26-29z"/><path d="M150 67v95"/></g>;
    case 'roomkey': return <g><rect x="83" y="52" width="91" height="63" rx="8"/><path d="M174 83h52M207 83v18M220 83v12"/>{text && label(text,128,91,23)}</g>;
    case 'blanket': return <g><path d="M85 58h130v104H85z"/><path d="M85 88c35-17 63 17 95 0s35 7 35 7M108 58v104"/></g>;
    case 'soap': return <g><rect x="106" y="87" width="88" height="65" rx="11"/><path d="M128 87V66h44v21M139 66V54h43M182 54v13"/><circle cx="91" cy="78" r="10"/><circle cx="203" cy="69" r="7"/></g>;
    case 'toilet': return <g><path d="M110 58h80v43c0 20-16 36-36 36h-8c-20 0-36-16-36-36z"/><path d="M120 137h60l11 25h-82z"/>{text && label(text,150,89,20)}</g>;
    case 'receipt': return <g><path d="M103 40h94v122l-12-8-12 8-12-8-12 8-12-8-12 8-12-8-10 8z"/><path d="M119 82h62M119 101h62M119 120h47M119 139h62"/>{text && label(text,150,65,11)}</g>;
  }
}
