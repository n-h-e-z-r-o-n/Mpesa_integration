type Props = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: Props) {
  return (
    <div className="panel-muted rounded-sm px-5 py-8 text-sm">
      <div className="font-medium text-white">{title}</div>
      <p className="mt-2 max-w-xl text-[var(--text-muted)]">{description}</p>
    </div>
  );
}
