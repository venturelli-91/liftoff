import InstructorsView from "./instructors-view";

export default function InstructorsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">
        Instructors
      </h1>
      <InstructorsView />
    </main>
  );
}
