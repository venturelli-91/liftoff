"use client";

import { type FormEvent, useCallback, useEffect, useState } from "react";
import type { Instructor } from "@/lib/instructors";
import { BTN_PRIMARY, CARD, INPUT, TD, TH } from "../ui";

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

  const err = (f: string) => errors.find((x) => x.field === f)?.message ?? null;

  return (
    <div className="flex flex-col gap-6">
      <form onSubmit={submit} className={`${CARD} flex flex-col gap-4 p-5`}>
        <h2 className="text-base font-medium">New instructor</h2>
        <div className="flex flex-col gap-4 sm:flex-row">
          <label className="flex flex-1 flex-col gap-2 text-[13px] text-fg-2">
            Name
            <input
              className={INPUT}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            {err("name") && <span className="text-neg">{err("name")}</span>}
          </label>
          <label className="flex flex-1 flex-col gap-2 text-[13px] text-fg-2">
            Email
            <input
              className={INPUT}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {err("email") && <span className="text-neg">{err("email")}</span>}
          </label>
        </div>
        <label className="flex flex-col gap-2 text-[13px] text-fg-2">
          Bio (optional)
          <textarea
            className={`${INPUT} h-auto py-2`}
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
          />
          {err("bio") && <span className="text-neg">{err("bio")}</span>}
        </label>
        {message && <p className="text-[13px] text-neg">{message}</p>}
        <button type="submit" className={`${BTN_PRIMARY} self-start`}>
          Create
        </button>
      </form>
      <div className={`${CARD} overflow-x-auto`}>
        <table className="w-full text-left">
          <thead>
            <tr>
              <th className={TH}>Name</th>
              <th className={TH}>Email</th>
              <th className={TH}>Bio</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={3} className={`${TD} text-fg-3`}>
                  No instructors yet
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-line">
                <td className={TD}>{r.name}</td>
                <td className={TD}>{r.email}</td>
                <td className={TD}>{r.bio}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
