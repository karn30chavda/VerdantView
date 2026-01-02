"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  PlusCircle,
  ScanLine,
  Edit,
  Trash2,
  Calendar,
  Tag,
  Wallet,
  CreditCard,
  Laptop,
  MoreHorizontal,
  Search,
  ListPlus,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

import { useExpenses as useExpensesData } from "@/hooks/use-expenses";
import type { Expense } from "@/lib/types";
import { deleteExpense } from "@/lib/db";
import { ExpenseForm } from "@/components/expense-form";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const paymentModeIcons = {
  Cash: Wallet,
  Card: CreditCard,
  Online: Laptop,
  Other: MoreHorizontal,
};

function ExpenseDetails({ expense }: { expense: Expense }) {
  const PaymentIcon = paymentModeIcons[expense.paymentMode] || MoreHorizontal;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm mt-2 p-4 bg-muted/50 rounded-md">
      <div className="flex items-center gap-2">
        <Tag className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Category:</span>
        <span className="font-medium">{expense.category}</span>
      </div>
      <div className="flex items-center gap-2">
        <PaymentIcon className="h-4 w-4 text-muted-foreground" />
        <span className="text-muted-foreground">Mode:</span>
        <span className="font-medium">{expense.paymentMode}</span>
      </div>
      <div className="flex items-center gap-2">
        <Calendar className="h-6 w-6 text-muted-foreground" />
        <span className="text-muted-foreground">Date:</span>
        <span className="font-medium">
          {format(new Date(expense.date), "PPP")}
        </span>
      </div>
    </div>
  );
}

function ExpenseListItem({
  expense,
  onDelete,
  onEditSuccess,
}: {
  expense: Expense;
  onDelete: (id: number) => void;
  onEditSuccess: () => void;
}) {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const isIncome = expense.type === "income";

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    onEditSuccess();
  };

  return (
    <AccordionItem
      value={String(expense.id)}
      className="border-b-0 mb-3 last:mb-0"
    >
      <div className="border rounded-lg bg-card overflow-hidden hover:bg-accent/5 transition-colors">
        <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-transparent">
          <div className="flex justify-between w-full items-center gap-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div
                className={cn(
                  "p-2.5 rounded-full shrink-0 flex items-center justify-center",
                  isIncome
                    ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
                )}
              >
                {isIncome ? (
                  <Wallet className="h-5 w-5" />
                ) : (
                  <Wallet className="h-5 w-5" />
                )}
              </div>
              <div className="flex flex-col items-start truncate text-left">
                <span className="font-semibold truncate w-full">
                  {expense.title}
                </span>
                <span className="text-xs text-muted-foreground truncate w-full">
                  {format(new Date(expense.date), "MMM d")} • {expense.category}
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span
                className={cn(
                  "font-bold text-base block",
                  isIncome
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {isIncome ? "+" : "-"}
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  maximumFractionDigits: 0,
                }).format(expense.amount)}
              </span>
              <span className="text-xs text-muted-foreground hidden sm:inline-block">
                {expense.paymentMode}
              </span>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 border-t bg-muted/20">
          <ExpenseDetails expense={expense} />
          <div className="flex justify-end gap-2 mt-4">
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                  <Edit className="mr-2 h-3.5 w-3.5" /> Edit
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Edit Transaction</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                  <ExpenseForm expense={expense} onSave={handleEditSuccess} />
                </div>
              </DialogContent>
            </Dialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="h-8">
                  <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Transaction?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete
                    this transaction from your history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => expense.id && onDelete(expense.id)}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </AccordionContent>
      </div>
    </AccordionItem>
  );
}

const ExpensesSkeleton = () => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-24" />
      </div>
    </div>
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-20 w-full rounded-lg" />
      ))}
    </div>
  </div>
);

export default function ExpensesPage() {
  const { expenses, categories, loading, error, refresh } = useExpensesData();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest");

  const filteredAndSortedExpenses = useMemo(() => {
    let result = expenses;

    // Filter by Search Term
    if (searchTerm) {
      result = result.filter((expense) =>
        expense.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by Category
    if (categoryFilter !== "all") {
      result = result.filter((expense) => expense.category === categoryFilter);
    }

    // Filter by Type (Income/Expense/All)
    if (typeFilter !== "all") {
      result = result.filter((e) => {
        if (typeFilter === "income") return e.type === "income";
        if (typeFilter === "expense") return !e.type || e.type === "expense";
        return true;
      });
    }

    // Sort
    result.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortOrder === "newest" ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [expenses, searchTerm, categoryFilter, typeFilter, sortOrder]);

  const handleDelete = async (id: number) => {
    try {
      await deleteExpense(id);
      toast({ title: "Transaction deleted successfully." });
      refresh();
    } catch (err) {
      toast({ title: "Failed to delete transaction.", variant: "destructive" });
    }
  };

  const handleEditSuccess = () => {
    refresh();
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-6 pb-20">
        <ExpensesSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-destructive text-lg font-semibold">
          Error Loading Data
        </div>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground">
            View and manage your financial history.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="h-9">
            <Link href="/expenses/bulk">
              <ListPlus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Bulk Add</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-9">
            <Link href="/scan">
              <ScanLine className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Scan Bill</span>
            </Link>
          </Button>
          <Button
            asChild
            className="h-9 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Link href="/expenses/new">
              <PlusCircle className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">New Transaction</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <Card className="rounded-lg shadow-sm border-none bg-muted/40">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background border-muted-foreground/20"
              />
            </div>

            <div className="flex gap-2 w-full md:w-auto">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="flex-1 w-full bg-background border-muted-foreground/20 focus:ring-1 focus:ring-gray-400 focus:ring-offset-0">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="flex-1 w-full bg-background border-muted-foreground/20 focus:ring-1 focus:ring-gray-400 focus:ring-offset-0">
                  <Filter className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories &&
                    categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.name}>
                        {cat.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>

              <Select value={sortOrder} onValueChange={setSortOrder}>
                <SelectTrigger className="flex-1 w-full bg-background border-muted-foreground/20 focus:ring-1 focus:ring-gray-400 focus:ring-offset-0">
                  <ArrowUpDown className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <div className="space-y-4">
        {filteredAndSortedExpenses.length > 0 ? (
          <Accordion type="multiple" className="space-y-3">
            {filteredAndSortedExpenses.map((expense) => (
              <ExpenseListItem
                key={expense.id}
                expense={expense}
                onDelete={handleDelete}
                onEditSuccess={handleEditSuccess}
              />
            ))}
          </Accordion>
        ) : (
          <div className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed rounded-xl bg-muted/10">
            <div className="bg-muted/30 p-4 rounded-full mb-4">
              <Search className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold">No transactions found</h3>
            <p className="text-muted-foreground max-w-sm mt-1">
              We couldn't find any transactions matching your filters. Try
              adjusting them or add a new one.
            </p>
            <Button
              variant="link"
              onClick={() => {
                setSearchTerm("");
                setCategoryFilter("all");
                setTypeFilter("all");
              }}
              className="mt-2"
            >
              Clear all filters
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
