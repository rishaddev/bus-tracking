import { deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";
import { getISTTimestamp } from "@/lib/utils";

// GET: Get route by ID
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { id } = await params;
    const routeDoc = await getDoc(doc(db, "routes", id));

    if (!routeDoc.exists()) {
      return NextResponse.json({ message: "Route not found" }, { status: 404 });
    }

    return NextResponse.json(
      { id: routeDoc.id, ...routeDoc.data() },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching route", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update route
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
    const { date, time, timestamp } = getISTTimestamp();

    await updateDoc(doc(db, "routes", id), {
      ...data,
      updatedDate: date,
      updateTime: time,
    });

    return NextResponse.json(
      { message: "Route updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating route", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete route
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

    const routeDoc = await getDoc(doc(db, "routes", id));
    if (!routeDoc.exists()) {
      return NextResponse.json({ message: "Route not found" }, { status: 404 });
    }

    await deleteDoc(doc(db, "routes", id));

    return NextResponse.json(
      { message: "Route deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting route", error: error.message },
      { status: 500 }
    );
  }
}
