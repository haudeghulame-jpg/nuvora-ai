// Shown instead of a form when the Firebase project is not connected yet.
// It says so plainly: no fake sign-in and no pretend data.
export function UnavailableNotice({ text }: { text: string }) {
  return (
    <p
      role="status"
      className="rounded-md border border-neutral-300 bg-neutral-50 p-4 text-sm"
    >
      {text}
    </p>
  );
}
