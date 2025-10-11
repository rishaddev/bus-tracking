import { doc, getDoc, updateDoc } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";
import { getISTTimestamp } from "@/lib/utils";

// GET: Get bus status
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { id } = await params;
    const busDoc = await getDoc(doc(db, "buses", id));

    if (!busDoc.exists()) {
      return NextResponse.json({ message: "Bus not found" }, { status: 404 });
    }

    const busData = busDoc.data();
    const statusInfo = {
      id: busDoc.id,
      currentStatus: busData.currentStatus,
      isActive: busData.isActive,
      lastMaintenance: busData.lastMaintenance,
      nextMaintenance: busData.nextMaintenance,
      updatedDate: busData.updatedDate,
    };

    return NextResponse.json(statusInfo, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching bus status", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update bus status
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
      "ACTIVE",
      "INACTIVE",
      "MAINTENANCE",
      "BREAKDOWN",
      "CLEANING",
    ];
    if (data.currentStatus && !allowedStatuses.includes(data.currentStatus)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 422 });
    }

    await updateDoc(doc(db, "buses", id), {
      ...data,
      updatedDate: date,
      updatedTime: time,
    });

    return NextResponse.json(
      { message: "Bus status updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating bus status", error: error.message },
      { status: 500 }
    );
  }
}
