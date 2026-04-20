import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties, ReactNode } from "react";

type Props = {
  id: string;
  children: (handleProps: {
    listeners: ReturnType<typeof useSortable>["listeners"];
    attributes: ReturnType<typeof useSortable>["attributes"];
    isDragging: boolean;
  }) => ReactNode;
  as?: "tr" | "div";
  className?: string;
};

export function SortableRow({ id, children, as = "tr", className }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    position: "relative",
    zIndex: isDragging ? 2 : "auto",
  };

  if (as === "div") {
    return (
      <div ref={setNodeRef} style={style} className={className}>
        {children({ listeners, attributes, isDragging })}
      </div>
    );
  }

  return (
    <tr ref={setNodeRef} style={style} className={className}>
      {children({ listeners, attributes, isDragging })}
    </tr>
  );
}

export function DragHandle({
  listeners,
  attributes,
  label = "arrastar para reordenar",
}: {
  listeners: ReturnType<typeof useSortable>["listeners"];
  attributes: ReturnType<typeof useSortable>["attributes"];
  label?: string;
}) {
  return (
    <button
      type="button"
      className="admin-drag-handle"
      aria-label={label}
      {...listeners}
      {...attributes}
    >
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <circle cx="4" cy="3" r="1.2" />
        <circle cx="4" cy="7" r="1.2" />
        <circle cx="4" cy="11" r="1.2" />
        <circle cx="10" cy="3" r="1.2" />
        <circle cx="10" cy="7" r="1.2" />
        <circle cx="10" cy="11" r="1.2" />
      </svg>
    </button>
  );
}
