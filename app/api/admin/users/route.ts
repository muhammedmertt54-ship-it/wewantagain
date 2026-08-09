import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

async function requireAdmin(request: NextRequest) {
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const accessToken = authorization.slice(7);

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(accessToken);

  if (userError || !user) {
    return {
      error: NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      ),
    };
  }

  const { data: adminRow, error: adminError } =
    await supabaseAdmin
      .from("admins")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle();

  if (adminError || !adminRow) {
    return {
      error: NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      ),
    };
  }

  return {
    user,
    accessToken,
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);

    if ("error" in auth) {
      return auth.error;
    }

    const pageParam = Number(
      request.nextUrl.searchParams.get("page") ?? "1"
    );

    const perPageParam = Number(
      request.nextUrl.searchParams.get("perPage") ?? "100"
    );

    const page =
      Number.isFinite(pageParam) && pageParam >= 1
        ? Math.floor(pageParam)
        : 1;

    const perPage =
      Number.isFinite(perPageParam) &&
      perPageParam >= 1 &&
      perPageParam <= 1000
        ? Math.floor(perPageParam)
        : 100;

    const {
      data,
      error,
    } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error("listUsers error:", error);

      return NextResponse.json(
        { error: "Users could not be loaded." },
        { status: 500 }
      );
    }

    const { data: adminRows } = await supabaseAdmin
      .from("admins")
      .select("user_id");

    const adminIds = new Set(
      (adminRows ?? []).map((row) => row.user_id)
    );

    const users = data.users.map((user) => ({
      id: user.id,
      email: user.email ?? null,

      createdAt: user.created_at,
      lastSignInAt: user.last_sign_in_at ?? null,

      emailConfirmedAt:
        user.email_confirmed_at ?? null,

      bannedUntil:
        user.banned_until ?? null,

      isAdmin:
        adminIds.has(user.id),

      providers:
        user.identities
          ?.map((identity) => identity.provider)
          .filter(Boolean) ?? [],

      metadata:
        user.user_metadata ?? {},
    }));

    return NextResponse.json({
      users,
      page,
      perPage,
      currentAdminId: auth.user.id,
    });
  } catch (error) {
    console.error("Admin users API error:", error);

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}