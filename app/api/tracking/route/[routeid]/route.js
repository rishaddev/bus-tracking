import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate } from "@/lib/auth";

// GET: Get tracking for route
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { routeid } = await params;
    const { searchParams } = new URL(req.url);
    const limitCount = parseInt(searchParams.get('limit')) || 50;
    
    const trackingSnapshot = await getDocs(
      query(
        collection(db, "tracking"), 
        where("routeId", "==", routeid),
        orderBy("createdDate", "desc")
      )
    );
    
    const allTrackingData = trackingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const sortedData = allTrackingData.sort((a, b) => {
      if (a.createdDate !== b.createdDate) {
        return b.createdDate.localeCompare(a.createdDate);
      }
      return b.createdTime.localeCompare(a.createdTime);
    });

    const trackingData = sortedData.slice(0, limitCount);

    return NextResponse.json(trackingData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching route tracking", error: error.message },
      { status: 500 }
    );
  }
}