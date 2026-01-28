"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Plus,
  Map as MapIcon,
  Calendar,
  Users,
  ArrowRight,
  Trash2,
  Loader2,
  ChevronRight,
  MoreVertical,
  CheckCircle2,
  Clock,
  Download,
  FileJson,
  FileUp,
  FileText,
} from "lucide-react";
import { useTrips } from "@/features/trips/hooks";
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
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportData, importData } from "@/lib/db/db";
import { generateTripPDF } from "@/lib/utils/pdf";
import { calculateSettlements } from "@/lib/utils/settlement";

export default function TripsPage() {
  const {
    trips,
    loading,
    error,
    createTrip,
    removeTrip,
    downloadTrip,
    fetchTripById,
    fetchTripExpensesById,
  } = useTrips();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [newTripMembers, setNewTripMembers] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAddTrip = async () => {
    if (!newTripName.trim()) {
      toast({ title: "Please enter a trip name", variant: "destructive" });
      return;
    }

    const members = newTripMembers
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

    if (members.length === 0) {
      toast({
        title: "Please enter at least one member",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createTrip(newTripName, members);
      setNewTripName("");
      setNewTripMembers("");
      setIsAddDialogOpen(false);
      toast({ title: "Trip created successfully!" });
    } catch (err) {
      toast({ title: "Failed to create trip", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTrip = async (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirm("Are you sure you want to delete this trip?")) {
      await removeTrip(id);
      toast({ title: "Trip deleted" });
    }
  };

  if (error) {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center gap-4 text-center">
        <MapIcon className="size-12 text-destructive opacity-50" />
        <h2 className="text-2xl font-bold">Error Loading Trips</h2>
        <p className="text-muted-foreground">{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Group Trips</h1>
          <p className="text-muted-foreground mt-1">
            Manage expenses and settlements for your group adventures.
          </p>
        </div>
        <div className="flex gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Download className="h-4 w-4" /> Data
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Trip Data Management</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={async () => {
                  try {
                    const data = await exportData();
                    const blob = new Blob([JSON.stringify(data, null, 2)], {
                      type: "application/json",
                    });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = `verdantview_trips_${format(new Date(), "yyyy-MM-dd")}.json`;
                    a.click();
                    toast({ title: "Backup started!" });
                  } catch (err) {
                    toast({
                      title: "Export failed",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <FileJson className="mr-2 h-4 w-4" /> Export All Trips
              </DropdownMenuItem>
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
                            "Do you want to merge this data with your existing records? Existing trips with same IDs will be appended as new trips.",
                          )
                        ) {
                          await importData(data);
                          toast({
                            title: "Data imported successfully!",
                          });
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
                <FileUp className="mr-2 h-4 w-4" /> Import & Merge JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 shadow-lg hover:shadow-xl transition-all">
                <Plus className="h-4 w-4" /> New Trip
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Create New Trip</DialogTitle>
                <DialogDescription>
                  Enter the name of your trip and comma-separated names of all
                  members.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Trip Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Goa Trip 2024"
                    value={newTripName}
                    onChange={(e) => setNewTripName(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="members">Members (comma separated)</Label>
                  <Input
                    id="members"
                    placeholder="Karan, Member-One, Member-Two..."
                    value={newTripMembers}
                    onChange={(e) => setNewTripMembers(e.target.value)}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Don't forget to include yourself if you're part of the
                    expenses!
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  onClick={handleAddTrip}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Trip"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-2xl" />
          ))}
        </div>
      ) : trips.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trips.map((trip: any) => (
            <div key={trip.id} className="relative group">
              <Link href={`/trips/${trip.id}`} className="block h-full">
                <Card className="overflow-hidden h-full hover:shadow-md transition-all border-none bg-card/50 backdrop-blur-sm ring-1 ring-border/50 hover:ring-primary/20">
                  <CardHeader className="pb-2">
                    <div className="p-2 w-fit bg-primary/10 rounded-xl mb-2">
                      <MapIcon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {trip.name}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(trip.createdAt), "MMM d, yyyy")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{trip.members.length} Members</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {trip.members
                          .slice(0, 3)
                          .map((member: string, i: number) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-muted rounded-full text-[10px] font-medium"
                            >
                              {member}
                            </span>
                          ))}
                        {trip.members.length > 3 && (
                          <span className="px-2 py-0.5 bg-muted rounded-full text-[10px] font-medium">
                            +{trip.members.length - 3} more
                          </span>
                        )}
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
                        <span
                          className={cn(
                            "flex items-center gap-1",
                            trip.status === "completed"
                              ? "text-emerald-500"
                              : "text-amber-500",
                          )}
                        >
                          {trip.status === "completed" ? (
                            <CheckCircle2 className="h-3 w-3" />
                          ) : (
                            <Clock className="h-3 w-3" />
                          )}
                          {trip.status}
                        </span>
                        <span className="flex items-center gap-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          Details <ChevronRight className="h-3 w-3" />
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>

              <div className="absolute top-2 right-2 z-10">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted transition-all"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={async (e) => {
                        e.preventDefault();
                        if (trip.id) {
                          const [fullTrip, expenses] = await Promise.all([
                            fetchTripById(trip.id),
                            fetchTripExpensesById(trip.id),
                          ]);
                          const settlements = calculateSettlements(
                            fullTrip.members,
                            expenses,
                          );
                          generateTripPDF(fullTrip, expenses, settlements);
                        }
                      }}
                    >
                      <FileText className="mr-2 h-4 w-4" /> Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.preventDefault();
                        trip.id && downloadTrip(trip.id);
                      }}
                    >
                      <FileJson className="mr-2 h-4 w-4" /> Export JSON
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={(e) => trip.id && handleDeleteTrip(e, trip.id)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Trip
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-2 bg-muted/5 p-12 flex flex-col items-center justify-center text-center">
          <div className="p-4 bg-muted rounded-full mb-4">
            <MapIcon className="h-10 w-10 text-muted-foreground/40" />
          </div>
          <h3 className="text-xl font-semibold">No trips planned yet</h3>
          <p className="text-muted-foreground max-w-sm mt-2 mb-6">
            Planning a vacation with friends? Create a trip to start tracking
            who spent how much.
          </p>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="rounded-full px-8"
          >
            Start Your First Trip
          </Button>
        </Card>
      )}
    </div>
  );
}
