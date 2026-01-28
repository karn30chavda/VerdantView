"use client";

import { useState, useEffect, useCallback, useMemo, use } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Plus,
  Map as MapIcon,
  ArrowLeft,
  Trash2,
  Loader2,
  Users,
  Wallet,
  Receipt,
  HandCoins,
  ArrowRightLeft,
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Download,
  FileJson,
  FileText,
  FileUp,
  MoreVertical,
} from "lucide-react";
import { useTrips } from "@/features/trips/hooks";
import type { Trip, TripExpense } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { calculateSettlements } from "@/lib/utils/settlement";
import { generateTripPDF } from "@/lib/utils/pdf";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function TripDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { toast } = useToast();

  const tripId = useMemo(() => {
    if (!id) return NaN;
    const parsed = parseInt(id);
    return isNaN(parsed) ? NaN : parsed;
  }, [id]);

  const {
    fetchTripById,
    fetchTripExpensesById,
    createTripExpense,
    removeTripExpense,
    updateTripStatus,
    downloadTrip,
    uploadTrip,
  } = useTrips({ skipFetch: true });

  const [trip, setTrip] = useState<Trip | null>(null);
  const [expenses, setExpenses] = useState<TripExpense[]>([]);
  const [loading, setLoading] = useState(true);

  // Add Expense Form State
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [payer, setPayer] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!tripId || isNaN(tripId)) return;

    try {
      setLoading(true);
      const [tripData, expenseData] = await Promise.all([
        fetchTripById(tripId),
        fetchTripExpensesById(tripId),
      ]);

      if (!tripData) {
        toast({ title: "Trip not found", variant: "destructive" });
        router.push("/trips");
        return;
      }

      setTrip(tripData);
      setExpenses(
        expenseData.sort(
          (a: TripExpense, b: TripExpense) =>
            new Date(b.date).getTime() - new Date(a.date).getTime(),
        ),
      );
    } catch (err) {
      console.error("Error loading trip data:", err);
      toast({ title: "Failed to load trip details", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [tripId, fetchTripById, fetchTripExpensesById, router, toast]);

  useEffect(() => {
    let mounted = true;
    if (mounted) {
      loadData();
    }
    return () => {
      mounted = false;
    };
  }, [loadData]);

  const stats = useMemo(() => {
    if (!trip || expenses.length === 0) return { total: 0, average: 0 };
    const total = expenses.reduce((sum, e) => sum + e.amount, 0);
    const average = total / trip.members.length;
    return { total, average };
  }, [trip, expenses]);

  const settlements = useMemo(() => {
    if (!trip) return [];
    return calculateSettlements(trip.members, expenses);
  }, [trip, expenses]);

  const handleAddExpense = async () => {
    if (!amount || !description || !payer) {
      toast({ title: "Please fill all fields", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      await createTripExpense({
        tripId,
        payerName: payer,
        amount: parseFloat(amount),
        description,
        date: new Date().toISOString(),
      });

      setAmount("");
      setDescription("");
      setPayer("");
      setIsAddDialogOpen(false);
      toast({ title: "Expense added!" });
      loadData();
    } catch (err) {
      toast({ title: "Failed to add expense", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    if (confirm("Delete this expense?")) {
      await removeTripExpense(id);
      toast({ title: "Expense deleted" });
      loadData();
    }
  };

  const handleToggleStatus = async () => {
    if (!trip) return;
    const newStatus = trip.status === "active" ? "completed" : "active";
    const updatedTrip = {
      ...trip,
      status: newStatus as "active" | "completed",
    };
    await updateTripStatus(updatedTrip);
    setTrip(updatedTrip);
    toast({ title: `Trip marked as ${newStatus}` });
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!trip) return null;

  return (
    <div className="flex flex-col gap-8 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="w-fit -ml-2 text-muted-foreground"
          onClick={() => router.push("/trips")}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Trips
        </Button>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              {trip.name}
            </h1>
            <div className="flex flex-wrap items-center gap-6 mt-3 text-sm text-muted-foreground font-medium">
              <span className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
                <CalendarIcon className="h-4 w-4 text-primary" />
                {format(new Date(trip.createdAt), "MMM d, yyyy")}
              </span>
              <span className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full">
                <Users className="h-4 w-4 text-primary" />
                {trip.members.length} Members
              </span>
              <span
                className={cn(
                  "flex items-center gap-2 px-3 py-1 rounded-full font-bold uppercase text-[10px] tracking-widest",
                  trip.status === "completed"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : "bg-amber-500/10 text-amber-600 border border-amber-500/20",
                )}
              >
                {trip.status === "completed" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Loader2 className="h-3.5 w-3.5 animate-spin-slow" />
                )}
                {trip.status}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 rounded-full border-muted-foreground/20 hover:bg-muted transition-all"
                >
                  <MoreVertical className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Trip Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleToggleStatus}>
                  {trip.status === "active" ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Finish Trip
                    </>
                  ) : (
                    <>
                      <Loader2 className="mr-2 h-4 w-4" /> Reopen Trip
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Export Data</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => generateTripPDF(trip, expenses, settlements)}
                >
                  <FileText className="mr-2 h-4 w-4" /> Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => downloadTrip(tripId)}>
                  <FileJson className="mr-2 h-4 w-4" /> Export as JSON
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-primary"
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".json";
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (re) => {
                        try {
                          const data = JSON.parse(re.target?.result as string);
                          if (
                            confirm(
                              "Do you want to MERGE these expenses into the CURRENT trip?",
                            )
                          ) {
                            // Logic to add each expense to current tripId
                            const expensesToImport = data.expenses || [];
                            for (const ex of expensesToImport) {
                              const { id: _, ...rest } = ex;
                              await createTripExpense({
                                ...rest,
                                tripId: tripId,
                              });
                            }
                            toast({ title: "Expenses merged successfully!" });
                            loadData();
                          }
                        } catch (err) {
                          toast({
                            title: "Invalid file format",
                            variant: "destructive",
                          });
                        }
                      };
                      reader.readAsText(file);
                    };
                    input.click();
                  }}
                >
                  <FileUp className="mr-2 h-4 w-4" /> Merge Expenses Here
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".json";
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async (re) => {
                        try {
                          const data = JSON.parse(re.target?.result as string);
                          if (
                            confirm(
                              "This will import this as a NEW trip. Continue?",
                            )
                          ) {
                            await uploadTrip(data);
                            toast({ title: "New Trip created from import!" });
                            router.push("/trips");
                          }
                        } catch (err) {
                          toast({
                            title: "Invalid file format",
                            variant: "destructive",
                          });
                        }
                      };
                      reader.readAsText(file);
                    };
                    input.click();
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" /> Import as New Trip
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="h-10 rounded-full px-6 bg-primary text-primary-foreground shadow-lg hover:shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all gap-2">
                  <Plus className="h-5 w-5" />
                  <span className="font-semibold text-sm">Add Expense</span>
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Trip Expense</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Who Paid?</Label>
                    <Select value={payer} onValueChange={setPayer}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select member" />
                      </SelectTrigger>
                      <SelectContent>
                        {trip.members.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount (₹)</Label>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      placeholder="e.g. Dinner, Fuel, Entry Fee"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleAddExpense}
                    disabled={isSubmitting}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      "Save Expense"
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="bg-primary/5 border-none">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Wallet className="h-3 w-3" /> Total Spent
            </CardDescription>
            <CardTitle className="text-3xl text-primary">
              ₹{stats.total.toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-muted/50 border-none">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <HandCoins className="h-3 w-3" /> Per Person Split
            </CardDescription>
            <CardTitle className="text-3xl">
              ₹{Math.round(stats.average).toLocaleString()}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-muted/50 border-none sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1">
              <Users className="h-3 w-3" /> Members
            </CardDescription>
            <div className="flex flex-wrap gap-1 mt-1">
              {trip.members.map((m) => (
                <span
                  key={m}
                  className="px-2 py-1 bg-background rounded-md text-xs font-medium border"
                >
                  {m}
                </span>
              ))}
            </div>
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Expenses List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              Expenses
            </h2>
            <span className="text-xs text-muted-foreground">
              {expenses.length} records
            </span>
          </div>

          {expenses.length > 0 ? (
            <div className="space-y-3">
              {expenses.map((exp) => (
                <div
                  key={exp.id}
                  className="group flex items-center justify-between p-4 bg-card rounded-xl border hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-center justify-center h-12 w-12 bg-muted rounded-xl text-muted-foreground shrink-0">
                      <span className="text-xs font-bold uppercase">
                        {format(new Date(exp.date), "MMM")}
                      </span>
                      <span className="text-lg font-bold leading-none">
                        {format(new Date(exp.date), "dd")}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{exp.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Paid by{" "}
                        <span className="font-medium text-foreground">
                          {exp.payerName}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <p className="font-bold text-lg">
                        ₹{exp.amount.toLocaleString()}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all duration-200 transform group-hover:translate-x-0 translate-x-2"
                      onClick={() => exp.id && handleDeleteExpense(exp.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center bg-muted/20 border-2 border-dashed rounded-2xl">
              <p className="text-muted-foreground">
                No expenses recorded for this trip.
              </p>
            </div>
          )}
        </div>

        {/* Settlement section */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5 text-muted-foreground" />
            Settlements
          </h2>

          <Card className="border-none shadow-md bg-gradient-to-br from-primary/10 to-transparent">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                Who Pays Whom
              </CardTitle>
            </CardHeader>
            <CardContent>
              {settlements.length > 0 ? (
                <div className="space-y-4">
                  {settlements.map((s, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-2 p-3 bg-background/50 rounded-lg border border-primary/10"
                    >
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-primary">
                          {s.from}
                        </span>
                        <div className="flex-1 flex items-center justify-center px-4">
                          <div className="h-[1px] w-full bg-primary/20 relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-1.5 h-1.5 border-t border-r border-primary/40 rotate-45" />
                          </div>
                        </div>
                        <span className="font-semibold text-emerald-600">
                          {s.to}
                        </span>
                      </div>
                      <div className="text-center font-bold text-lg">
                        ₹{Math.round(s.amount).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 text-[10px] text-muted-foreground flex items-start gap-1">
                    <AlertCircle className="h-3 w-3 shrink-0" />
                    <span>
                      Calculated by splitting the total ₹
                      {stats.total.toLocaleString()} equally among{" "}
                      {trip.members.length} people.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    Everything is settled!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Member Balance Summary */}
          <div className="space-y-2 mt-6">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Balance Sheet
            </h3>
            <div className="space-y-1">
              {trip.members.map((member) => {
                const totalSpent = expenses
                  .filter((e) => e.payerName === member)
                  .reduce((s, e) => s + e.amount, 0);
                const balance = totalSpent - stats.average;
                return (
                  <div
                    key={member}
                    className="flex items-center justify-between p-2 text-sm"
                  >
                    <span>{member}</span>
                    <div className="text-right">
                      <p className="font-medium text-[10px] text-muted-foreground">
                        Spent ₹{totalSpent}
                      </p>
                      <p
                        className={cn(
                          "font-bold",
                          balance > 0.01
                            ? "text-emerald-600"
                            : balance < -0.01
                              ? "text-red-600"
                              : "text-muted-foreground",
                        )}
                      >
                        {balance > 0.01 ? "+" : ""}
                        {Math.round(balance).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
