"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getTrips,
  addTrip,
  deleteTrip,
  dbEvents,
  getTrip,
  updateTrip,
  getTripExpenses,
  addTripExpense,
  deleteTripExpense,
  exportTrip,
  importTrip,
} from "@/lib/db/db";
import type { Trip, TripExpense } from "@/lib/types";

export function useTrips(options: { skipFetch?: boolean } = {}) {
  const { skipFetch = false } = options;
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrips = useCallback(async () => {
    try {
      setLoading(true);
      const fetchedTrips = await getTrips();
      setTrips(
        fetchedTrips.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        ),
      );
    } catch (err: any) {
      console.error("Failed to fetch trips:", err);
      setError(err.message || "Failed to load trips");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipFetch) return;
    fetchTrips();

    const handleDataChanged = () => {
      fetchTrips();
    };

    dbEvents.addEventListener("dataChanged", handleDataChanged);
    return () => {
      dbEvents.removeEventListener("dataChanged", handleDataChanged);
    };
  }, [fetchTrips, skipFetch]);

  const createTrip = useCallback(async (name: string, members: string[]) => {
    const newTrip: Omit<Trip, "id"> = {
      name,
      members,
      createdAt: new Date().toISOString(),
      status: "active",
    };
    await addTrip(newTrip);
  }, []);

  const removeTrip = useCallback(async (id: number) => {
    await deleteTrip(id);
  }, []);

  const updateTripStatus = useCallback(async (trip: Trip) => {
    await updateTrip(trip);
  }, []);

  // Expense Management
  const fetchTripById = useCallback(async (id: number) => {
    return await getTrip(id);
  }, []);

  const fetchTripExpensesById = useCallback(async (tripId: number) => {
    return await getTripExpenses(tripId);
  }, []);

  const createTripExpense = useCallback(
    async (expense: Omit<TripExpense, "id">) => {
      await addTripExpense(expense);
    },
    [],
  );

  const removeTripExpense = useCallback(async (id: number) => {
    await deleteTripExpense(id);
  }, []);

  const downloadTrip = useCallback(async (id: number) => {
    const data = await exportTrip(id);
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${data.trip.name.replace(/\s+/g, "_")}_data.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const uploadTrip = useCallback(
    async (data: { trip: Trip; expenses: TripExpense[] }) => {
      await importTrip(data);
    },
    [],
  );

  return useMemo(
    () => ({
      trips,
      loading,
      error,
      createTrip,
      removeTrip,
      updateTripStatus,
      fetchTripById,
      fetchTripExpensesById,
      createTripExpense,
      removeTripExpense,
      downloadTrip,
      uploadTrip,
      refresh: fetchTrips,
    }),
    [
      trips,
      loading,
      error,
      createTrip,
      removeTrip,
      updateTripStatus,
      fetchTripById,
      fetchTripExpensesById,
      createTripExpense,
      removeTripExpense,
      downloadTrip,
      uploadTrip,
      fetchTrips,
    ],
  );
}
