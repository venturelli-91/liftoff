import AuditTable from "./audit-table";

export default function AuditPage() {
  return (
    <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-8">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight">Audit log</h1>
      <AuditTable />
    </main>
  );
}
