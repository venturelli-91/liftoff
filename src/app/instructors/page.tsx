import InstructorsView from "./instructors-view";

export default function InstructorsPage() {
  return (
    <main className="w-full p-6 md:p-8">
      <h1 className="mb-8 text-[28px] leading-[1.15] font-medium">
        Instructors
      </h1>
      <InstructorsView />
    </main>
  );
}
