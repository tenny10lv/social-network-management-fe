import { useEffect, useMemo, useState } from 'react';

export type Identifiable = { id: string };

export function useBulkActions<T extends Identifiable>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds((previous) => previous.filter((id) => items.some((item) => item.id === id)));
  }, [items]);

  const toggle = (id: string) => {
    setSelectedIds((previous) => (previous.includes(id) ? previous.filter((value) => value !== id) : [...previous, id]));
  };

  const selectOnly = (id: string) => {
    setSelectedIds([id]);
  };

  const selectAll = () => {
    setSelectedIds(items.map((item) => item.id));
  };

  const clear = () => {
    setSelectedIds([]);
  };

  const isSelected = (id: string) => selectedIds.includes(id);

  const summary = useMemo(
    () => ({
      count: selectedIds.length,
      hasSelection: selectedIds.length > 0,
      allSelected: items.length > 0 && selectedIds.length === items.length,
    }),
    [items.length, selectedIds],
  );

  return {
    selectedIds,
    toggle,
    selectOnly,
    selectAll,
    clear,
    isSelected,
    summary,
  };
}
