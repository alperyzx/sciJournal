import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Edit, Search } from 'lucide-react';

interface Props {
  journal: any;
  onEdit: (j: any) => void;
  onTest: (url: string) => void;
  loading?: boolean;
}

export default function JournalCardCompact({ journal, onEdit, onTest, loading }: Props) {
  return (
    <Card className="p-1.5 shadow-sm">
      <CardContent className="flex items-start gap-2.5 p-2">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-medium leading-snug text-gray-900 dark:text-gray-100 break-words line-clamp-2">
            {journal.journalName}
          </h4>
          <span className="mt-0.5 block text-[11px] leading-none text-gray-400">{journal.type}</span>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Test ${journal.journalName}`}
            className="h-8 w-8"
            onClick={() => onTest(journal.url)}
          >
            <Search className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="icon"
            variant="ghost"
            aria-label={`Edit ${journal.journalName}`}
            className="h-8 w-8"
            onClick={() => onEdit(journal)}
          >
            <Edit className="w-3.5 h-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
