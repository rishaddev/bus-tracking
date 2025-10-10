import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";
import { getISTTimestamp } from "@/lib/utils";

// GET: Get trip by ID
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

    return NextResponse.json(
      { id: tripDoc.id, ...tripDoc.data() },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching trip", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update trip
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

    await updateDoc(doc(db, "trips", id), {
      ...data,
      updateDate: date,
      updateTime: time,
    });

    return NextResponse.json(
      { message: "Trip updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating trip", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete trip
export async function DELETE(req, { params }) {
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

    const tripDoc = await getDoc(doc(db, "trips", id));
    if (!tripDoc.exists()) {
      return NextResponse.json({ message: "Trip not found" }, { status: 404 });
    }

    await deleteDoc(doc(db, "trips", id));

    return NextResponse.json(
      { message: "Trip deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting trip", error: error.message },
      { status: 500 }
    );
  }
}
