export interface ProgramVariant {
  id: string;
  label: string;
  sublabel: string;
  sessions: string[];
}

export interface ProgramTemplate {
  id: string;
  name: string;
  icon: string;
  color: string;
  description: string;
  variants: ProgramVariant[];
}

export const PROGRAM_TEMPLATES: ProgramTemplate[] = [
  {
    id: 'upper-lower',
    name: 'Upper / Lower',
    icon: 'body-outline',
    color: '#7C6FF7',
    description: 'Haut du corps · Bas du corps',
    variants: [
      {
        id: 'ul-2j',
        label: 'Upper/Lower × 1',
        sublabel: '2 séances — A',
        sessions: ['Upper/Lower — Upper A', 'Upper/Lower — Lower A'],
      },
      {
        id: 'ul-4j',
        label: 'Upper/Lower × 2',
        sublabel: '4 séances — A + B',
        sessions: [
          'Upper/Lower — Upper A', 'Upper/Lower — Lower A',
          'Upper/Lower — Upper B', 'Upper/Lower — Lower B',
        ],
      },
      {
        id: 'ul-6j',
        label: 'Upper/Lower × 3',
        sublabel: '6 séances — A + B + C',
        sessions: [
          'Upper/Lower — Upper A', 'Upper/Lower — Lower A',
          'Upper/Lower — Upper B', 'Upper/Lower — Lower B',
          'Upper/Lower — Upper C', 'Upper/Lower — Lower C',
        ],
      },
    ],
  },
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    icon: 'fitness-outline',
    color: '#4ECDC4',
    description: 'Poussé · Tiré · Jambes',
    variants: [
      {
        id: 'ppl-3j',
        label: 'PPL × 1',
        sublabel: '3 séances — A',
        sessions: ['PPL — Push A', 'PPL — Pull A', 'PPL — Legs A'],
      },
      {
        id: 'ppl-6j',
        label: 'PPL × 2',
        sublabel: '6 séances — A + B',
        sessions: [
          'PPL — Push A', 'PPL — Pull A', 'PPL — Legs A',
          'PPL — Push B', 'PPL — Pull B', 'PPL — Legs B',
        ],
      },
    ],
  },
  {
    id: 'ppl-ul',
    name: 'PPL + Upper/Lower',
    icon: 'grid-outline',
    color: '#FF6B6B',
    description: 'Push · Pull · Legs · Upper · Lower',
    variants: [
      {
        id: 'pplul-5j',
        label: 'PPL + Upper/Lower',
        sublabel: '5 séances',
        sessions: [
          'PPL+UL — Push', 'PPL+UL — Pull', 'PPL+UL — Legs',
          'PPL+UL — Upper', 'PPL+UL — Lower',
        ],
      },
    ],
  },
  {
    id: 'split',
    name: 'Split 5 jours',
    icon: 'layers-outline',
    color: '#FFB347',
    description: 'Pec · Dos · Épaules · Jambes · Bras',
    variants: [
      {
        id: 'split-5j',
        label: 'Split 5 jours',
        sublabel: '5 séances',
        sessions: [
          'Split — Pectoraux', 'Split — Dos', 'Split — Épaules',
          'Split — Jambes', 'Split — Bras & Abdos',
        ],
      },
    ],
  },
];
