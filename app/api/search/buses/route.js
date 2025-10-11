import { collection, getDocs, query, where } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate } from "@/lib/auth";

// GET: Search buses with filters
export async function GET(req) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const route = searchParams.get('route');
    const province = searchParams.get('province');
    const operator = searchParams.get('operator');
    const status = searchParams.get('status');

    let busesQuery = query(
      collection(db, "buses"), 
      where("isActive", "==", true)
    );

    if (route) {
      busesQuery = query(busesQuery, where("routeId", "==", route));
    }

    if (province) {
      // This would require additional logic to match buses with routes in the province
      // For now, we'll search in operator's operating provinces
      busesQuery = query(busesQuery, where("operatingProvinces", "array-contains", province));
    }

    if (operator) {
      busesQuery = query(busesQuery, where("operatorId", "==", operator));
    }

    if (status) {
      busesQuery = query(busesQuery, where("currentStatus", "==", status));
    }

    const busesSnapshot = await getDocs(busesQuery);
    
    const buses = busesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return NextResponse.json({
      searchParams: { route, province, operator, status },
      results: buses,
      count: buses.length
    }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error searching buses", error: error.message },
      { status: 500 }
    );
  }
}