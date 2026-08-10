import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    const firstIp = forwardedFor
      .split(",")[0]
      ?.trim();

    if (firstIp) {
      return firstIp;
    }
  }

  const realIp = request.headers.get("x-real-ip");

  if (realIp) {
    return realIp.trim();
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const authorization =
      request.headers.get("authorization");

    if (
      !authorization ||
      !authorization.startsWith("Bearer ")
    ) {
      return NextResponse.json(
        {
          error: "Unauthorized",
        },
        {
          status: 401,
        }
      );
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
      return NextResponse.json(
        {
          error: "Invalid session",
        },
        {
          status: 401,
        }
      );
    }

    const ipAddress =
      getClientIp(request);

    if (!ipAddress) {
      return NextResponse.json(
        {
          error:
            "IP address could not be detected.",
        },
        {
          status: 400,
        }
      );
    }

    const now =
      new Date().toISOString();

    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from("user_ips")
      .select("id")
      .eq("user_id", user.id)
      .eq("ip_address", ipAddress)
      .maybeSingle();

    if (existingError) {
      console.error(
        "IP lookup error:",
        existingError
      );

      return NextResponse.json(
        {
          error:
            "IP information could not be checked.",
        },
        {
          status: 500,
        }
      );
    }

    if (existing) {
      const { error: updateError } =
        await supabaseAdmin
          .from("user_ips")
          .update({
            last_seen_at: now,
          })
          .eq("id", existing.id);

      if (updateError) {
        console.error(
          "IP update error:",
          updateError
        );

        return NextResponse.json(
          {
            error:
              "IP information could not be updated.",
          },
          {
            status: 500,
          }
        );
      }
    } else {
      const { error: insertError } =
        await supabaseAdmin
          .from("user_ips")
          .insert({
            user_id: user.id,
            ip_address: ipAddress,
            first_seen_at: now,
            last_seen_at: now,
          });

      if (insertError) {
        console.error(
          "IP insert error:",
          insertError
        );

        return NextResponse.json(
          {
            error:
              "IP information could not be saved.",
          },
          {
            status: 500,
          }
        );
      }
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Register IP API error:",
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