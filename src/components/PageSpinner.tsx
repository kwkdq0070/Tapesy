export function PageSpinner() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-tape-accent border-t-transparent" />
    </div>
  );
}
