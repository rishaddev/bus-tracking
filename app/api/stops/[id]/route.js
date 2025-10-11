import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";
import { getISTTimestamp } from "@/lib/utils";

// GET: Get stop by ID
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { id } = await params;
    const stopDoc = await getDoc(doc(db, "stops", id));

    if (!stopDoc.exists()) {
      return NextResponse.json({ message: "Stop not found" }, { status: 404 });
    }

    return NextResponse.json(
      { id: stopDoc.id, ...stopDoc.data() },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching stop", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update stop
export async function PUT(req, { params }) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["admin"]);
    if (roleCheck.error) {
      return NextResponse.json({ message: roleCheck.error }, { status: 403 });
    }

    const { id } = await params;

    const data = await req.json();
    const { date, time } = getISTTimestamp();

    await updateDoc(doc(db, "stops", id), {
      ...data,
      updatedDate: date,
      updatedTime: time,
    });

    return NextResponse.json(
      { message: "Stop updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating stop", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete stop (soft delete)
export async function DELETE(req, { params }) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const roleCheck = requireRole(user, ["admin"]);
    if (roleCheck.error) {
      return NextResponse.json({ message: roleCheck.error }, { status: 403 });
    }

    const { id } = await params;
    const stopDoc = await getDoc(doc(db, "stops", id));
    if (!stopDoc.exists()) {
      return NextResponse.json({ message: "Stop not found" }, { status: 404 });
    }

    await deleteDoc(doc(db, "stops", id));

    return NextResponse.json(
      { message: "Stop deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting stop", error: error.message },
      { status: 500 }
    );
  }
}
