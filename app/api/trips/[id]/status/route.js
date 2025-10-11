import { doc, getDoc, updateDoc } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";
import { getISTTimestamp } from "@/lib/utils";

// GET: Get trip status
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { id } = await params;
    const tripDoc = await getDoc(doc(db, "trips", id));

    if (!tripDoc.exists()) {
      return NextResponse.json({ message: "Trip not found" }, { status: 404 });
    }

    const tripData = tripDoc.data();
    const statusInfo = {
      id: tripDoc.id,
      status: tripData.status,
      delay: tripData.delay,
      scheduledStart: tripData.scheduledStart,
      scheduledEnd: tripData.scheduledEnd,
      actualStart: tripData.actualStart,
      actualEnd: tripData.actualEnd,
      currentPassengers: tripData.currentPassengers,
      updatedAt: tripData.updatedAt,
    };

    return NextResponse.json(statusInfo, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching trip status", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update trip status
export async function PUT(req, { params }) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["admin", "operator"]);
    if (roleCheck.error) {
      return NextResponse.json({ message: roleCheck.error }, { status: 403 });
    }

    const { id } = await params;
    const data = await req.json();
    const { date, time } = getISTTimestamp();

    const allowedStatuses = [
      "SCHEDULED",
      "STARTED",
      "IN_PROGRESS",
      "DELAYED",
      "COMPLETED",
      "CANCELLED",
    ];
    if (data.status && !allowedStatuses.includes(data.status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 422 });
    }

    const updateData = {
      ...data,
      updatedDate: date,
      updatedTime: time,
    };

    // Set actual start/end times based on status
    if (data.status === "STARTED" || data.status === "IN_PROGRESS") {
      updateData.actualStart = updateData.actualStart || `${date}-${time}`;
    } else if (data.status === "COMPLETED") {
      updateData.actualEnd = updateData.actualEnd || `${date}-${time}`;
    }

    await updateDoc(doc(db, "trips", id), updateData);

    return NextResponse.json(
      { message: "Trip status updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating trip status", error: error.message },
      { status: 500 }
    );
  }
}
