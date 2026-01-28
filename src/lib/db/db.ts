"use client";

import type {
  Expense,
  Category,
  Reminder,
  AppSettings,
  SavingsTransaction,
  Trip,
  TripExpense,
} from "../types";
import { startOfDay } from "date-fns";

const DB_NAME = "VerdantViewDB";
const DB_VERSION = 5; // Incremented for trips and trip_expenses

let dbPromise: Promise<IDBDatabase> | null = null;

const defaultCategories = [
  "Groceries",
  "Dining",
  "Travel",
  "Utilities",
  "Shopping",
  "Food",
  "Medicine",
  "Other",
];

// Create a simple event emitter for database changes
export const dbEvents = new EventTarget();

function getDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") {
    // This is a client-side only library
    return Promise.reject(new Error("IndexedDB not available on server-side."));
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error("IndexedDB error:", request.error);
        reject("Error opening database");
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains("expenses")) {
          const expenseStore = db.createObjectStore("expenses", {
            keyPath: "id",
            autoIncrement: true,
          });
          expenseStore.createIndex("date", "date", { unique: false });
        }
        if (!db.objectStoreNames.contains("categories")) {
          const catStore = db.createObjectStore("categories", {
            keyPath: "id",
            autoIncrement: true,
          });
          catStore.createIndex("name", "name", { unique: true });
        }
        if (!db.objectStoreNames.contains("reminders")) {
          const reminderStore = db.createObjectStore("reminders", {
            keyPath: "id",
            autoIncrement: true,
          });
          reminderStore.createIndex("date", "date", { unique: false });
        } else {
          // If the store exists, check if the index exists
          const transaction = (event.target as IDBOpenDBRequest).transaction;
          if (transaction) {
            const reminderStore = transaction.objectStore("reminders");
            if (!reminderStore.indexNames.contains("date")) {
              reminderStore.createIndex("date", "date", { unique: false });
            }
          }
        }
        if (!db.objectStoreNames.contains("settings")) {
          db.createObjectStore("settings", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("savings_transactions")) {
          const savingsStore = db.createObjectStore("savings_transactions", {
            keyPath: "id",
            autoIncrement: true,
          });
          savingsStore.createIndex("date", "date", { unique: false });
        }
        if (!db.objectStoreNames.contains("trips")) {
          const tripStore = db.createObjectStore("trips", {
            keyPath: "id",
            autoIncrement: true,
          });
          tripStore.createIndex("status", "status", { unique: false });
        }
        if (!db.objectStoreNames.contains("trip_expenses")) {
          const tripExpenseStore = db.createObjectStore("trip_expenses", {
            keyPath: "id",
            autoIncrement: true,
          });
          tripExpenseStore.createIndex("tripId", "tripId", { unique: false });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Use a separate function to handle initial data population
        populateInitialData(db)
          .then(() => resolve(db))
          .catch(reject);
      };
    });
  }
  return dbPromise;
}

async function populateInitialData(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["categories", "settings"], "readwrite");
    const categoryStore = transaction.objectStore("categories");
    const settingsStore = transaction.objectStore("settings");
    let checksCompleted = 0;

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);

    const onCheckComplete = () => {
      checksCompleted++;
    };

    const catRequest = categoryStore.getAll();
    catRequest.onsuccess = (e) => {
      const existingCategories = (e.target as IDBRequest<Category[]>).result;
      const existingCategoryNames = new Set(
        existingCategories.map((c) => c.name),
      );

      let addedNew = false;
      defaultCategories.forEach((name) => {
        if (!existingCategoryNames.has(name)) {
          categoryStore.add({ name });
          addedNew = true;
        }
      });
      onCheckComplete();
    };
    catRequest.onerror = () => reject(catRequest.error);

    const settingsRequest = settingsStore.count();
    settingsRequest.onsuccess = (e) => {
      const count = (e.target as IDBRequest).result;
      if (count === 0) {
        settingsStore.add({
          id: 1,
          monthlyBudget: 1000,
          emergencyFundGoal: 50000,
          emergencyFundCurrent: 0,
          userName: "Friend",
        });
      }
      onCheckComplete();
    };
    settingsRequest.onerror = () => reject(settingsRequest.error);
  });
}

// Generic CRUD operations
async function performDBOperation<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest | IDBRequest<any[]>,
): Promise<T> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);

    let request: IDBRequest | IDBRequest<any[]>;
    try {
      request = operation(store);
    } catch (err) {
      reject(err);
      return;
    }

    transaction.oncomplete = () => {
      if (mode === "readwrite") {
        dbEvents.dispatchEvent(new CustomEvent("dataChanged"));
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    transaction.onerror = () => reject(transaction.error);
  });
}

// Expenses
export const getExpenses = (): Promise<Expense[]> =>
  performDBOperation("expenses", "readonly", (store) => store.getAll());
export const addExpense = (
  expense: Omit<Expense, "id">,
): Promise<IDBValidKey> =>
  performDBOperation("expenses", "readwrite", (store) => store.add(expense));
export const updateExpense = (expense: Expense): Promise<IDBValidKey> =>
  performDBOperation("expenses", "readwrite", (store) => store.put(expense));
export const deleteExpense = (id: number): Promise<void> =>
  performDBOperation("expenses", "readwrite", (store) => store.delete(id));

// Categories
export const getCategories = (): Promise<Category[]> =>
  performDBOperation("categories", "readonly", (store) => store.getAll());
export const addCategory = (
  category: Omit<Category, "id">,
): Promise<IDBValidKey> =>
  performDBOperation("categories", "readwrite", (store) => store.add(category));
export const deleteCategory = async (id: number): Promise<void> => {
  const db = await getDB();
  const tx = db.transaction("categories", "readwrite");
  const store = tx.objectStore("categories");

  tx.oncomplete = () => dbEvents.dispatchEvent(new CustomEvent("dataChanged"));

  return new Promise((resolve, reject) => {
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const categoryToDelete = getRequest.result;
      if (
        categoryToDelete &&
        defaultCategories.includes(categoryToDelete.name)
      ) {
        // We double-check here, but primary logic is in the UI
        reject(new Error("Cannot delete a default category."));
        return;
      }
      const deleteRequest = store.delete(id);
      deleteRequest.onsuccess = () => resolve();
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
};

// Reminders
export const getReminders = (): Promise<Reminder[]> =>
  performDBOperation("reminders", "readonly", (store) => store.getAll());
export const addReminder = (
  reminder: Omit<Reminder, "id">,
): Promise<IDBValidKey> =>
  performDBOperation("reminders", "readwrite", (store) => store.add(reminder));
export const deleteReminder = (id: number): Promise<void> =>
  performDBOperation("reminders", "readwrite", (store) => store.delete(id));

export const clearOldReminders = async (): Promise<void> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction("reminders", "readwrite");
    const store = transaction.objectStore("reminders");
    const index = store.index("date");

    const yesterday = startOfDay(new Date());
    const range = IDBKeyRange.upperBound(yesterday.toISOString(), true);

    const request = index.openCursor(range);
    let deletedCount = 0;
    let updatedCount = 0;

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor) {
        const reminder: Reminder = cursor.value;

        // If it's a recurring reminder, update its date instead of deleting
        if (reminder.isRecurring && reminder.repeatInterval) {
          const currentDate = new Date(reminder.date);
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + reminder.repeatInterval);

          const updatedReminder = {
            ...reminder,
            date: nextDate.toISOString(),
            lastTriggered: reminder.date, // Store when it was last due
          };

          cursor.update(updatedReminder);
          updatedCount++;
        } else {
          // Non-recurring reminders get deleted
          cursor.delete();
          deletedCount++;
        }
        cursor.continue();
      }
    };

    transaction.oncomplete = () => {
      if (deletedCount > 0 || updatedCount > 0) {
        console.log(
          `Cleared ${deletedCount} old reminders, updated ${updatedCount} recurring reminders.`,
        );
        dbEvents.dispatchEvent(new CustomEvent("dataChanged"));
      }
      resolve();
    };

    transaction.onerror = () => {
      reject(transaction.error);
    };
  });
};

// Settings
export const getSettings = (): Promise<AppSettings> =>
  performDBOperation("settings", "readonly", (store) => store.get(1));
export const updateSettings = async (
  settings: Partial<AppSettings>,
): Promise<IDBValidKey> => {
  const existingSettings = await getSettings();
  return performDBOperation("settings", "readwrite", (store) =>
    store.put({ ...existingSettings, ...settings, id: 1 }),
  );
};

// Savings Transactions
export const getSavingsTransactions = (): Promise<SavingsTransaction[]> =>
  performDBOperation("savings_transactions", "readonly", (store) =>
    store.getAll(),
  );

export const addSavingsTransaction = (
  transaction: Omit<SavingsTransaction, "id">,
): Promise<IDBValidKey> =>
  performDBOperation("savings_transactions", "readwrite", (store) =>
    store.add(transaction),
  );

export const updateSavingsTransaction = (
  transaction: SavingsTransaction,
): Promise<IDBValidKey> =>
  performDBOperation("savings_transactions", "readwrite", (store) =>
    store.put(transaction),
  );

export const deleteSavingsTransaction = (id: number): Promise<void> =>
  performDBOperation("savings_transactions", "readwrite", (store) =>
    store.delete(id),
  );

// Trips
export const getTrips = (): Promise<Trip[]> =>
  performDBOperation("trips", "readonly", (store) => store.getAll());

export const getTrip = (id: number): Promise<Trip> =>
  performDBOperation("trips", "readonly", (store) => store.get(id));

export const addTrip = (trip: Omit<Trip, "id">): Promise<IDBValidKey> =>
  performDBOperation("trips", "readwrite", (store) => store.add(trip));

export const updateTrip = (trip: Trip): Promise<IDBValidKey> =>
  performDBOperation("trips", "readwrite", (store) => store.put(trip));

export const deleteTrip = (id: number): Promise<void> =>
  performDBOperation("trips", "readwrite", (store) => store.delete(id));

// Trip Expenses
export const getTripExpenses = (tripId: number): Promise<TripExpense[]> => {
  return performDBOperation<TripExpense[]>(
    "trip_expenses",
    "readonly",
    (store) => {
      const index = store.index("tripId");
      return index.getAll(tripId);
    },
  );
};

export const addTripExpense = (
  expense: Omit<TripExpense, "id">,
): Promise<IDBValidKey> =>
  performDBOperation("trip_expenses", "readwrite", (store) =>
    store.add(expense),
  );

export const updateTripExpense = (expense: TripExpense): Promise<IDBValidKey> =>
  performDBOperation("trip_expenses", "readwrite", (store) =>
    store.put(expense),
  );

export const deleteTripExpense = (id: number): Promise<void> =>
  performDBOperation("trip_expenses", "readwrite", (store) => store.delete(id));

// Data Management
export const exportData = async () => {
  const expenses = await getExpenses();
  const categories = await getCategories();
  const reminders = await getReminders();
  const settings = await getSettings();
  const savingsTransactions = await getSavingsTransactions();
  const trips = await getTrips();
  const tripExpenses: TripExpense[] = [];
  for (const trip of trips) {
    if (trip.id) {
      const expenses = await getTripExpenses(trip.id);
      tripExpenses.push(...expenses);
    }
  }
  return {
    expenses,
    categories,
    reminders,
    settings,
    savingsTransactions,
    trips,
    trip_expenses: tripExpenses,
  };
};

export const importData = async (data: {
  expenses?: Expense[];
  categories?: Category[];
  reminders?: Reminder[];
  settings?: AppSettings;
  savingsTransactions?: SavingsTransaction[];
}) => {
  const db = await getDB();
  const storeNames: string[] = [
    "expenses",
    "categories",
    "reminders",
    "settings",
    "savings_transactions",
    "trips",
    "trip_expenses",
  ];
  const tx = db.transaction(storeNames, "readwrite");

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => {
      // Dispatch a custom event to notify other parts of the app
      dbEvents.dispatchEvent(new CustomEvent("dataChanged"));
      resolve();
    };
    tx.onerror = () => reject(tx.error);

    if (data.expenses) {
      const store = tx.objectStore("expenses");
      // Don't clear existing data, just append
      data.expenses.forEach((e) => {
        const { id, ...rest } = e; // Explicitly remove id to allow auto-increment
        if (typeof rest.amount === "string") {
          rest.amount = Number(rest.amount);
        }
        store.add(rest);
      });
    }

    if (data.categories) {
      const store = tx.objectStore("categories");

      data.categories.forEach((c) => {
        if (!defaultCategories.includes(c.name)) {
        }
      });

      const catStore = tx.objectStore("categories");
      const index = catStore.index("name");
      data.categories.forEach((c) => {
        const request = index.get(c.name);
        request.onsuccess = () => {
          if (!request.result) {
            catStore.add({ name: c.name });
          }
        };
      });
    }

    if (data.reminders) {
      const store = tx.objectStore("reminders");
      // Append reminders
      data.reminders.forEach((r) => {
        const { id, ...rest } = r;
        store.add(rest);
      });
    }

    if (data.settings) {
      const store = tx.objectStore("settings");
      // Settings we want to merge/overwrite
      const getReq = store.get(1);
      getReq.onsuccess = () => {
        const existing = getReq.result || {};
        store.put({ ...existing, ...data.settings, id: 1 });
      };
    }

    if (data.savingsTransactions) {
      const store = tx.objectStore("savings_transactions");
      data.savingsTransactions.forEach((s) => {
        const { id, ...rest } = s;
        store.add(rest);
      });
    }

    if ((data as any).trips) {
      const tripStore = tx.objectStore("trips");
      const expenseStore = tx.objectStore("trip_expenses");
      const tripData = (data as any).trips as Trip[];
      const expenseData = (data as any).trip_expenses as TripExpense[];

      tripData.forEach((t) => {
        const oldId = t.id;
        const { id, ...rest } = t;
        const addReq = tripStore.add(rest);
        addReq.onsuccess = (e) => {
          const newId = (e.target as IDBRequest).result as number;
          if (expenseData && oldId) {
            expenseData
              .filter((ex) => ex.tripId === oldId)
              .forEach((ex) => {
                const { id, ...exRest } = ex;
                exRest.tripId = newId;
                expenseStore.add(exRest);
              });
          }
        };
      });
    }
  });
};

export const exportTrip = async (tripId: number) => {
  const trip = await getTrip(tripId);
  const expenses = await getTripExpenses(tripId);
  return {
    trip,
    expenses,
    version: "1.0",
    exportedAt: new Date().toISOString(),
  };
};

export const importTrip = async (data: {
  trip: Trip;
  expenses: TripExpense[];
}) => {
  const db = await getDB();
  const tx = db.transaction(["trips", "trip_expenses"], "readwrite");

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => {
      dbEvents.dispatchEvent(new CustomEvent("dataChanged"));
      resolve();
    };
    tx.onerror = () => reject(tx.error);

    const tripStore = tx.objectStore("trips");
    const expenseStore = tx.objectStore("trip_expenses");

    const { id: oldId, ...tripRest } = data.trip;
    const addReq = tripStore.add(tripRest);
    addReq.onsuccess = (e) => {
      const newId = (e.target as IDBRequest).result as number;
      data.expenses.forEach((ex) => {
        const { id, ...exRest } = ex;
        exRest.tripId = newId;
        expenseStore.add(exRest);
      });
    };
  });
};

export const clearAllData = async () => {
  const db = await getDB();
  const storeNames: string[] = [
    "expenses",
    "categories",
    "reminders",
    "settings",
    "savings_transactions",
  ];
  const tx = db.transaction(storeNames, "readwrite");

  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = async () => {
      try {
        // Repopulate with defaults
        await populateInitialData(db);
        // Dispatch a custom event to notify other parts of the app
        dbEvents.dispatchEvent(new CustomEvent("dataChanged"));
        resolve();
      } catch (error) {
        reject(error);
      }
    };
    tx.onerror = () => reject(tx.error);

    for (const storeName of storeNames) {
      tx.objectStore(storeName).clear();
    }
  });
};
