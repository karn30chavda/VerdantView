import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { Trip, TripExpense } from "@/lib/types";
import { Settlement } from "./settlement";

export const generateTripPDF = (
  trip: Trip,
  expenses: TripExpense[],
  settlements: Settlement[],
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // Header
  doc.setFontSize(22);
  doc.setTextColor(16, 185, 129); // Emerald-500
  doc.text(trip.name, 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generated on: ${format(new Date(), "PPpp")}`, 14, 28);
  doc.text(`Trip Date: ${format(new Date(trip.createdAt), "PPP")}`, 14, 33);

  // Summary section
  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const perPerson = totalSpent / trip.members.length;

  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.text("Summary", 14, 45);

  autoTable(doc, {
    startY: 48,
    head: [["Total Spent", "Members", "Per Person Split"]],
    body: [
      [
        `INR ${totalSpent.toLocaleString()}`,
        trip.members.length.toString(),
        `INR ${Math.round(perPerson).toLocaleString()}`,
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [16, 185, 129] },
  });

  // Expenses table
  doc.text("Expense Details", 14, (doc as any).lastAutoTable.finalY + 15);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 18,
    head: [["Date", "Payer", "Description", "Amount (INR)"]],
    body: expenses.map((e) => [
      format(new Date(e.date), "MMM d, yyyy"),
      e.payerName,
      e.description,
      e.amount.toLocaleString(),
    ]),
    theme: "grid",
    headStyles: { fillColor: [16, 185, 129] },
  });

  // Settlements Table
  doc.text(
    "Settlement Instructions",
    14,
    (doc as any).lastAutoTable.finalY + 15,
  );

  if (settlements.length > 0) {
    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 18,
      head: [["From", "To", "Amount (INR)"]],
      body: settlements.map((s) => [
        s.from,
        s.to,
        Math.round(s.amount).toLocaleString(),
      ]),
      theme: "striped",
      headStyles: { fillColor: [245, 158, 11] }, // Amber-500
    });
  } else {
    doc.setFontSize(10);
    doc.text(
      "Everything is settled! No payments required.",
      14,
      (doc as any).lastAutoTable.finalY + 22,
    );
  }

  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(
      `VerdantView - Group Trip Planner | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: "center" },
    );
  }

  doc.save(`${trip.name.replace(/\s+/g, "_")}_Settlement.pdf`);
};
