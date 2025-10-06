import { collection, getDocs, where, query } from "firebase/firestore";
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { authenticate } from "@/lib/auth";

// GET: Get routes by province
export async function GET(req, { params }) {
  try {
    const authHeader = req.headers.get('authorization');
    const { user, error } = authenticate(authHeader?.replace('Bearer ', ''));
    if (error) {
      return NextResponse.json({ message: error }, { status: 401 });
    }
    const { province } = await params;
    const lowerProvince = province.toLowerCase();
   
    const routesSnapshot = await getDocs(collection(db, "routes"));
   
    const routes = routesSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(route => {
        const startLower = route.startProvince?.toLowerCase();
        const endLower = route.endProvince?.toLowerCase();
        return startLower === lowerProvince || endLower === lowerProvince;
      });
    
    return NextResponse.json(routes, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error fetching province routes", error: error.message },
      { status: 500 }
    );
  }
}