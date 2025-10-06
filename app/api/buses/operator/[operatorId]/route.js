import { collection, getDocs, query, where } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate } from "@/lib/auth";

// GET: Get buses by operator
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { operatorId } = await params;
    
    const busesSnapshot = await getDocs(
      query(collection(db, "buses"), 
        where("operatorId", "==", operatorId)
      )
    );
    
    const buses = busesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json(buses, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching operator buses", error: error.message },
      { status: 500 }
    );
  }
}