import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate } from "@/lib/auth";

// GET: Get latest bus location
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { busid } = await params;
    
    const trackingSnapshot = await getDocs(
      query(
        collection(db, "tracking"), 
        where("busId", "==", busid),
        orderBy("createdDate", "desc")
      )
    );
    
    if (trackingSnapshot.empty) {
      return NextResponse.json({ message: "No tracking data found" }, { status: 404 });
    }

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

    const trackingData = sortedData[0];

    return NextResponse.json(allTrackingData, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching bus location", error: error.message },
      { status: 500 }
    );
  }
}