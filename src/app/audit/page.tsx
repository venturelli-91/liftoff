import AuditTable from "./audit-table";

export default function AuditPage() {
  return (
    <main className="w-full p-6 md:p-8">
      <h1 className="mb-8 text-[28px] leading-[1.15] font-medium">Audit log</h1>
      <AuditTable />
    </main>
  );
}
