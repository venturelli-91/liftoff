import { DatabaseSync } from "node:sqlite";

export type Instructor = {
  id: number;
  name: string;
  email: string;
  bio: string;
};

export type InstructorInput = { name: string; email: string; bio?: string };

/** Thrown when another instructor already uses the email (case-insensitive). */
export class DuplicateEmailError extends Error {
  constructor(email: string) {
    super(`email already in use: ${email}`);
    this.name = "DuplicateEmailError";
  }
}

export class InstructorStore {
  private db: DatabaseSync;

  constructor(path = process.env.LIFTOFF_DB ?? "liftoff.db") {
    this.db = new DatabaseSync(path);
    this.db.exec(`CREATE TABLE IF NOT EXISTS instructors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE UNIQUE,
      bio TEXT NOT NULL DEFAULT ''
    )`);
  }

  list(): Instructor[] {
    const rows = this.db
      .prepare("SELECT id, name, email, bio FROM instructors ORDER BY id")
      .all() as Instructor[];
    return rows.map((r) => ({ ...r }));
  }

  get(id: number): Instructor | undefined {
    const row = this.db
      .prepare("SELECT id, name, email, bio FROM instructors WHERE id = ?")
      .get(id) as Instructor | undefined;
    return row && { ...row };
  }

  create(input: InstructorInput): Instructor {
    try {
      const r = this.db
        .prepare("INSERT INTO instructors (name, email, bio) VALUES (?, ?, ?)")
        .run(input.name, input.email, input.bio ?? "");
      return this.get(Number(r.lastInsertRowid)) as Instructor;
    } catch (e) {
      throw this.translate(e, input.email);
    }
  }

  /** Returns undefined when the id does not exist. */
  update(id: number, input: InstructorInput): Instructor | undefined {
    try {
      const r = this.db
        .prepare(
          "UPDATE instructors SET name = ?, email = ?, bio = ? WHERE id = ?",
        )
        .run(input.name, input.email, input.bio ?? "", id);
      return r.changes ? this.get(id) : undefined;
    } catch (e) {
      throw this.translate(e, input.email);
    }
  }

  private translate(e: unknown, email: string): unknown {
    return e instanceof Error && /UNIQUE/i.test(e.message)
      ? new DuplicateEmailError(email)
      : e;
  }
}

const g = globalThis as unknown as { __liftoffInstructors?: InstructorStore };

export function getInstructorStore(): InstructorStore {
  if (!g.__liftoffInstructors) g.__liftoffInstructors = new InstructorStore();
  return g.__liftoffInstructors;
}
