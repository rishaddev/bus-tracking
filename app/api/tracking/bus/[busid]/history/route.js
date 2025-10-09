import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate } from "@/lib/auth";

// GET: Get bus location history
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { busid } = await params;
    const { searchParams } = new URL(req.url);
    const hours = parseInt(searchParams.get('hours')) || 24;
    
    const now = new Date();
    const startTime = new Date(now.getTime() - (hours * 60 * 60 * 1000));
    const startDate = startTime.toISOString().split('T')[0];
    
    const trackingSnapshot = await getDocs(
      query(
        collection(db, "tracking"), 
        where("busId", "==", busid),
        where("createdDate", ">=", startDate),
        orderBy("createdDate", "asc")
      )
    );
    
    const allHistory = trackingSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const history = allHistory
      .filter(item => {
        const itemDateTime = new Date(`${item.createdDate}T${item.createdTime}`);
        return itemDateTime >= startTime;
      })
      .sort((a, b) => {
        if (a.createdDate !== b.createdDate) {
          return a.createdDate.localeCompare(b.createdDate);
        }
        return a.createdTime.localeCompare(b.createdTime);
      });

    return NextResponse.json(history, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching bus history", error: error.message },
      { status: 500 }
    );
  }
}