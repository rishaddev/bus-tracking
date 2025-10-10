import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate } from "@/lib/auth";

// GET: Get trips by bus ID
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { busId } = await params;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');

    let tripsQuery = query(
      collection(db, "trips"), 
      where("busId", "==", busId),
      where("isActive", "==", true)
    );

    if (date) {
      // Create date range strings for comparison (YYYY-MM-DD format)
      const startDateStr = `${date}T00:00:00Z`;
      const endDateStr = `${date}T23:59:59Z`;
      
      tripsQuery = query(
        collection(db, "trips"),
        where("busId", "==", busId),
        where("isActive", "==", true),
        where("scheduledStart", ">=", startDateStr),
        where("scheduledStart", "<=", endDateStr)
      );
    }

    const tripsSnapshot = await getDocs(tripsQuery);
    
    const trips = tripsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort trips by scheduledStart (descending for latest first, or ascending if date filter is used)
    const sortedTrips = trips.sort((a, b) => {
      if (date) {
        // If filtering by date, sort ascending (earliest first)
        return a.scheduledStart.localeCompare(b.scheduledStart);
      } else {
        // If no date filter, sort descending (latest first)
        return b.scheduledStart.localeCompare(a.scheduledStart);
      }
    });

    return NextResponse.json(sortedTrips, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching bus trips", error: error.message },
      { status: 500 }
    );
  }
}