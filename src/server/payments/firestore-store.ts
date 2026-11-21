import type { Firestore } from "firebase-admin/firestore";
import type { DecisionStore, StoreData } from "./apply-decision";

// The real database behind DecisionStore. A Firestore transaction retries when
// two requests touch the same documents at once, so two administrators cannot
// approve the same transaction at the same time.
export function createFirestoreStore(db: Firestore): DecisionStore {
  return {
    runTransaction: (run) =>
      db.runTransaction((transaction) =>
        run({
          get: async (path) => {
            const snapshot = await transaction.get(db.doc(path));
            return snapshot.exists ? (snapshot.data() as StoreData) : null;
          },
          update: (path, data) => {
            transaction.update(db.doc(path), data);
          },
          create: (path, data) => {
            transaction.create(db.doc(path), data);
          },
        }),
      ),
  };
}
