"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import type { Instructor } from "@/lib/instructors";

type FieldError = { field: string; message: string };

export default function InstructorsView() {
  const [rows, setRows] = useState<Instructor[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const res = await fetch("/api/instructors", { cache: "no-store" });
    if (res.ok) setRows(await res.json());
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setErrors([]);
    setMessage("");
    const res = await fetch("/api/instructors", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, email, bio: bio || undefined }),
    });
    if (res.ok) {
      setName("");
      setEmail("");
      setBio("");
      await refresh();
      return;
    }
    const data = await res.json().catch(() => ({}));
    if (Array.isArray(data.errors)) setErrors(data.errors);
    else if (data.field)
      setErrors([{ field: data.field, message: data.error }]);
    else setMessage(data.error ?? "Could not save instructor");
  }

  const input =
    "rounded border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900";
  const err = (f: string) => errors.find((x) => x.field === f)?.message ?? null;

  return (
    <div className="flex flex-col gap-6">
      <form
        onSubmit={submit}
        className="flex flex-col gap-3 rounded-lg border border-zinc-200 bg-white p-4"
      >
        <h2 className="font-medium">New instructor</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Name
            <input
              className={input}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {err("name") && <span className="text-red-600">{err("name")}</span>}
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm">
            Email
            <input
              className={input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {err("email") && (
              <span className="text-red-600">{err("email")}</span>
            )}
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          Bio (optional)
          <textarea
            className={input}
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          {err("bio") && <span className="text-red-600">{err("bio")}</span>}
        </label>
        {message && <p className="text-sm text-red-600">{message}</p>}
        <button
          type="submit"
          className="self-start rounded bg-zinc-900 px-3 py-1 text-sm text-white"
        >
          Create
        </button>
      </form>
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-zinc-600">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Email</th>
              <th className="px-3 py-2">Bio</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className="px-3 py-4 text-zinc-500">
                  No instructors yet.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-zinc-100">
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">{r.bio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
