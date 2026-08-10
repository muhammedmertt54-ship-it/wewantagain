import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "../../../../lib/supabaseAdmin";

export async function GET(
  request: NextRequest
) {
  try {
    const authorization =
      request.headers.get(
        "authorization"
      );

    if (
      !authorization ||
      !authorization.startsWith(
        "Bearer "
      )
    ) {
      return NextResponse.json(
        {
          valid: false,
          reason:
            "missing-session",
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
      error: tokenError,
    } =
      await supabaseAdmin.auth.getUser(
        accessToken
      );

    if (
      tokenError ||
      !user
    ) {
      return NextResponse.json(
        {
          valid: false,
          reason:
            "invalid-session",
        },
        {
          status: 401,
        }
      );
    }

    const {
      data: authUserData,
      error: authUserError,
    } =
      await supabaseAdmin.auth.admin.getUserById(
        user.id
      );

    if (
      authUserError ||
      !authUserData?.user
    ) {
      return NextResponse.json(
        {
          valid: false,
          reason:
            "user-deleted",
        },
        {
          status: 401,
        }
      );
    }

    const authUser =
      authUserData.user;

    const bannedUntil =
      authUser.banned_until
        ? new Date(
            authUser.banned_until
          ).getTime()
        : null;

    const isBanned =
      bannedUntil !== null &&
      Number.isFinite(
        bannedUntil
      ) &&
      bannedUntil >
        Date.now();

    if (isBanned) {
      return NextResponse.json(
        {
          valid: false,
          reason:
            "user-banned",
        },
        {
          status: 403,
        }
      );
    }

    return NextResponse.json({
      valid: true,
      userId: authUser.id,
    });
  } catch (error) {
    console.error(
      "Session status error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Session could not be checked.",
      },
      {
        status: 500,
      }
    );
  }
}