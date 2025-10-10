import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate } from "@/lib/auth";

// GET: Get trips by route ID
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { routeId } = await params;
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const status = searchParams.get('status');

    // Build base query
    let queryConditions = [
      where("routeId", "==", routeId),
      where("isActive", "==", true)
    ];

    // Add date filter if provided
    if (date) {
      // Create date range strings for comparison (YYYY-MM-DD format)
      const startDateStr = `${date}T00:00:00Z`;
      const endDateStr = `${date}T23:59:59Z`;
      
      queryConditions.push(
        where("scheduledStart", ">=", startDateStr),
        where("scheduledStart", "<=", endDateStr)
      );
    }

    // Add status filter if provided
    if (status) {
      queryConditions.push(where("status", "==", status));
    }

    const tripsQuery = query(collection(db, "trips"), ...queryConditions);

    const tripsSnapshot = await getDocs(tripsQuery);
    
    const trips = tripsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Sort trips by scheduledStart (ascending - earliest first)
    const sortedTrips = trips.sort((a, b) => {
      return a.scheduledStart.localeCompare(b.scheduledStart);
    });

    return NextResponse.json(sortedTrips, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching route trips", error: error.message },
      { status: 500 }
    );
  }
}