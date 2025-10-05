import { collection, addDoc, getDocs, where, query } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate, requireRole } from "@/lib/auth";
import { getISTTimestamp, validateRequiredFields } from "@/lib/utils";

// GET: Get all provinces
export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization");
    const { user, error } = authenticate(authHeader?.replace("Bearer ", ""));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const provincesSnapshot = await getDocs(query(collection(db, "provinces")));

    const provinces = provincesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json(provinces, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching provinces", error: error.message },
      { status: 500 }
    );
  }
}

// POST: Create new province
export async function POST(req) {
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

    const data = await req.json();

    const { name, capital, majorCities, busStations, provinceId } = data;

    const requiredFields = ["name", "capital", "majorCities", "busStations"];
    const validation = validateRequiredFields(data, requiredFields);
    if (validation.error) {
      return NextResponse.json({ message: validation.error }, { status: 422 });
    }

    const { date, time } = getISTTimestamp();

    const provinceData = {
      name,
      capital,
      majorCities,
      busStations,
      provinceId:
        data.provinceId || data.name.toLowerCase().replace(/\s+/g, "_"),
      isActive: data.isActive !== undefined ? data.isActive : true,
      createdDate: date,
      createdTime: time,
    };

    const docRef = await addDoc(collection(db, "provinces"), provinceData);

    return NextResponse.json(
      {
        message: "Province created successfully!",
        provinceId: docRef.id,
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error creating province", error: error.message },
      { status: 500 }
    );
  }
}
