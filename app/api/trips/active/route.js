import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate } from "@/lib/auth";

// GET: Get all active trips
export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const activeStatuses = ["STARTED", "IN_PROGRESS", "DELAYED"];

    const tripsSnapshot = await getDocs(
      query(
        collection(db, "trips"),
        where("isActive", "==", true),
        where("status", "in", activeStatuses),
        orderBy("scheduledStart", "asc")
      )
    );

    const trips = tripsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(trips, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching active trips", error: error.message },
      { status: 500 }
    );
  }
}
