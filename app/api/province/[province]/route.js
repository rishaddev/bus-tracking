import {
  deleteDoc,
  doc,
  getDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireAnyRole, requireRole } from "@/lib/auth";
import { getISTTimestamp } from "@/lib/utils";

// GET: Get province by Province
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { province } = await params;
    const provincesRef = collection(db, "provinces");
    const q = query(
      provincesRef,
      where("provinceId", "==", province.toLowerCase())
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { message: "Province not found" },
        { status: 404 }
      );
    }

    const provinceDoc = querySnapshot.docs[0];

    return NextResponse.json(
      { id: provinceDoc.id, ...provinceDoc.data() },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching province", error: error.message },
      { status: 500 }
    );
  }
}

// PUT: Update province
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

    const { province } = await params;
    const data = await req.json();
    const { date, time } = getISTTimestamp();

    const provincesRef = collection(db, "provinces");
    const q = query(
      provincesRef,
      where("provinceId", "==", province.toLowerCase())
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { message: "Province not found" },
        { status: 404 }
      );
    }

    const provinceDoc = querySnapshot.docs[0];
    
    // Prepare update data
    const updateData = {
      ...data,
      updatedDate: date,
      updatedTime: time,
    };
    
    // If name is being updated, also update provinceId
    if (data.name && data.name !== provinceDoc.data().name) {
      updateData.provinceId = data.name.toLowerCase().replace(/\s+/g, '_');
    }
    
    await updateDoc(provinceDoc.ref, updateData);

    return NextResponse.json(
      { message: "Province updated successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error updating province", error: error.message },
      { status: 500 }
    );
  }
}

// DELETE: Delete province
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

    const { province } = await params;

    const provincesRef = collection(db, "provinces");
    const q = query(
      provincesRef,
      where("provinceId", "==", province.toLowerCase())
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return NextResponse.json(
        { message: "Province not found" },
        { status: 404 }
      );
    }

    const provinceDoc = querySnapshot.docs[0];
    await deleteDoc(provinceDoc.ref);

    return NextResponse.json(
      { message: "Province deleted successfully!" },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error deleting province", error: error.message },
      { status: 500 }
    );
  }
}
