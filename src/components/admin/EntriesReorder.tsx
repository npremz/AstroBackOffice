import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, FileText, Loader2, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiPost } from '@/lib/api-client';

interface Entry {
  id: number;
  slug: string;
  data: Record<string, any>;
  sortOrder?: number;
}

interface SortableEntryProps {
  entry: Entry;
}

function SortableEntry({ entry }: SortableEntryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entry.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        flex items-center gap-3 p-3 bg-card border border-border/50 rounded-lg
        ${isDragging ? 'opacity-50 shadow-lg ring-2 ring-accent' : ''}
        hover:border-accent/50 transition-all duration-200
      `}
    >
      <button
        className="cursor-grab active:cursor-grabbing p-1.5 rounded-md hover:bg-muted transition-colors touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      <div className="p-2 rounded-lg bg-accent/10">
        <FileText className="h-4 w-4 text-accent" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium truncate">{entry.data.title || entry.slug}</p>
        <p className="text-xs text-muted-foreground font-mono">/{entry.slug}</p>
      </div>
      <Badge variant="secondary" className="text-xs">
        #{entry.sortOrder ?? 0}
      </Badge>
    </div>
  );
}

interface EntriesReorderProps {
  entries: Entry[];
  collectionId: number;
  onClose: () => void;
  onSaved: () => void;
}

export default function EntriesReorder({ entries: initialEntries, collectionId, onClose, onSaved }: EntriesReorderProps) {
  const [entries, setEntries] = useState<Entry[]>(
    [...initialEntries].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  );
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setEntries((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        const newItems = arrayMove(items, oldIndex, newIndex);
        // Update sortOrder values
        return newItems.map((item, index) => ({ ...item, sortOrder: index }));
      });
      setHasChanges(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const orderedIds = entries.map((e) => e.id);
      await apiPost('/api/entries/reorder', { orderedIds, collectionId });
      toast.success('Order saved', {
        description: 'Entry order has been updated successfully.',
      });
      setHasChanges(false);
      onSaved();
    } catch (error) {
      toast.error('Failed to save order', {
        description: 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      setEntries([...initialEntries].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)));
      setHasChanges(false);
    }
    onClose();
  };

  return (
    <Card className="card-float">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Reorder Entries</h3>
            <p className="text-sm text-muted-foreground">
              Drag and drop to change the order
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
            >
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="bg-accent hover:bg-accent/90"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1" />
              )}
              Save Order
            </Button>
          </div>
        </div>

        {hasChanges && (
          <div className="text-sm text-amber-600 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            You have unsaved changes
          </div>
        )}

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={entries.map((e) => e.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {entries.map((entry) => (
                <SortableEntry key={entry.id} entry={entry} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {entries.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No entries to reorder
          </div>
        )}
      </CardContent>
    </Card>
  );
}
