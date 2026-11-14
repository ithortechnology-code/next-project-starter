import { createAuth } from "./auth.js";
import { createDatabase } from "./database.js";

const database = createDatabase();
export const auth = createAuth(database.db, process.env);
