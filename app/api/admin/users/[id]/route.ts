import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

async function requireAdmin(request: NextRequest) {
  const authorization =
    request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      ),
    };
  }

  const accessToken =
    authorization.slice(7);

  const {
    data: { user },
    error: userError,
  } = await supabaseAdmin.auth.getUser(
    accessToken
  );

  if (userError || !user) {
    return {
      error: NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      ),
    };
  }

  const {
    data: adminRow,
    error: adminError,
  } = await supabaseAdmin
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
  };
}

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  try {
    const auth =
      await requireAdmin(request);

    if ("error" in auth) {
      return auth.error;
    }

    const { id } =
      await context.params;

    const userId =
      typeof id === "string"
        ? id.trim()
        : "";

    if (!userId) {
      return NextResponse.json(
        {
          error:
            "User ID is required.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: authUserData,
      error: authUserError,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        userId
      );

    if (
      authUserError ||
      !authUserData?.user
    ) {
      return NextResponse.json(
        {
          error:
            "User could not be found.",
        },
        {
          status: 404,
        }
      );
    }

    const authUser =
      authUserData.user;

    const [
      profileResult,
      adminResult,
      ipsResult,
      bansResult,
      campaignsResult,
      supportsResult,
      auditResult,
    ] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select(
          "username, display_name"
        )
        .eq("user_id", userId)
        .maybeSingle(),

      supabaseAdmin
        .from("admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle(),

      supabaseAdmin
        .from("user_ips")
        .select(
          "id, ip_address, first_seen_at, last_seen_at"
        )
        .eq("user_id", userId)
        .order("last_seen_at", {
          ascending: false,
        }),

      supabaseAdmin
        .from("ip_bans")
        .select("ip_address"),

      supabaseAdmin
        .from("campaigns")
        .select(
          "id, slug, title, subtitle, category, status, created_at, image_url, image_removed"
        )
        .eq("created_by", userId)
        .order("created_at", {
          ascending: false,
        }),

      supabaseAdmin
        .from("supports")
        .select(
          "campaign_slug, verified, email, country"
        )
        .eq("user_id", userId),

      supabaseAdmin
        .from("admin_audit_logs")
        .select(
          "id, admin_user_id, action, details, created_at"
        )
        .eq(
          "target_user_id",
          userId
        )
        .order("created_at", {
          ascending: false,
        })
        .limit(200),
    ]);

    if (
      profileResult.error
    ) {
      console.error(
        "Profile error:",
        profileResult.error
      );
    }

    if (
      adminResult.error
    ) {
      console.error(
        "Admin check error:",
        adminResult.error
      );
    }

    if (
      ipsResult.error
    ) {
      console.error(
        "User IPs error:",
        ipsResult.error
      );
    }

    if (
      bansResult.error
    ) {
      console.error(
        "IP bans error:",
        bansResult.error
      );
    }

    if (
      campaignsResult.error
    ) {
      console.error(
        "Campaigns error:",
        campaignsResult.error
      );
    }

    if (
      supportsResult.error
    ) {
      console.error(
        "Supports error:",
        supportsResult.error
      );
    }

    if (
      auditResult.error
    ) {
      console.error(
        "Audit error:",
        auditResult.error
      );
    }

    const bannedIpSet =
      new Set(
        (
          bansResult.data ??
          []
        )
          .map(
            (row) =>
              row.ip_address
          )
          .filter(
            (
              value
            ): value is string =>
              typeof value ===
                "string" &&
              value.length > 0
          )
      );

    const ips =
      (
        ipsResult.data ??
        []
      ).map(
        (ip) => ({
          id: ip.id,
          ip_address:
            ip.ip_address,
          first_seen_at:
            ip.first_seen_at,
          last_seen_at:
            ip.last_seen_at,

          banned:
            bannedIpSet.has(
              ip.ip_address
            ),
        })
      );

    const profile =
      profileResult.data;

    const user = {
      id: authUser.id,

      email:
        authUser.email ??
        null,

      username:
        profile?.username ??
        null,

      display_name:
        profile?.display_name ??
        null,

      is_admin:
        !!adminResult.data,

      created_at:
        authUser.created_at,

      last_sign_in_at:
        authUser.last_sign_in_at ??
        null,

      email_confirmed_at:
        authUser.email_confirmed_at ??
        null,

      banned_until:
        authUser.banned_until ??
        null,

      ips,

      campaigns:
        campaignsResult.data ??
        [],

      supports:
        supportsResult.data ??
        [],

      audit_logs:
        auditResult.data ??
        [],
    };

    return NextResponse.json({
      user,
    });
  } catch (error) {
    console.error(
      "Admin user details API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected server error.",
      },
      {
        status: 500,
      }
    );
  }
}