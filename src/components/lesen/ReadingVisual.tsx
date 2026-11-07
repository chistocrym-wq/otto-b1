import type { ReadingTask } from '@/types';

import { SMSCard } from './SMSCard';
import { EmailCard } from './EmailCard';
import { NoteCard } from './NoteCard';
import { FridgeNoteCard } from './FridgeNoteCard';
import { PostcardCard } from './PostcardCard';

interface ReadingVisualProps {
  task: ReadingTask;
}

export function ReadingVisual({ task }: ReadingVisualProps) {
  switch (task.visualType) {
    case 'sms':
      return <SMSCard visual={task.visual} />;

    case 'email':
      return <EmailCard visual={task.visual} />;

    case 'note':
      return <NoteCard visual={task.visual} />;

    case 'fridge-note':
      return <FridgeNoteCard visual={task.visual} />;

    case 'postcard':
      return <PostcardCard visual={task.visual} />;

    default:
      return (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Неизвестный формат задания: {task.visualType}
        </div>
      );
  }
}