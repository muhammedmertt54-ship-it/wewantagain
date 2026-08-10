import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  supabaseAdmin,
} from "../../../../lib/supabaseAdmin";

function decodeJwtPayload(
  token: string
) {
  try {
    const parts =
      token.split(".");

    if (
      parts.length < 2
    ) {
      return null;
    }

    const payload =
      parts[1];

    const normalized =
      payload
        .replace(/-/g, "+")
        .replace(/_/g, "/");

    const padding =
      "=".repeat(
        (4 -
          (normalized.length %
            4)) %
          4
      );

    const json =
      Buffer.from(
        normalized + padding,
        "base64"
      ).toString("utf8");

    return JSON.parse(
      json
    ) as {
      iat?: number;
      sub?: string;
    };
  } catch (error) {
    console.error(
      "JWT decode error:",
      error
    );

    return null;
  }
}

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

    const {
      data: sessionControl,
      error:
        sessionControlError,
    } = await supabaseAdmin
      .from(
        "user_session_controls"
      )
      .select(
        "revoked_before"
      )
      .eq(
        "user_id",
        user.id
      )
      .maybeSingle();

    if (
      sessionControlError
    ) {
      console.error(
        "Session control lookup error:",
        sessionControlError
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

    if (
      sessionControl
        ?.revoked_before
    ) {
      const payload =
        decodeJwtPayload(
          accessToken
        );

      const issuedAtSeconds =
        payload?.iat;

      if (
        issuedAtSeconds &&
        Number.isFinite(
          issuedAtSeconds
        )
      ) {
        const issuedAtMs =
          issuedAtSeconds *
          1000;

        const revokedBeforeMs =
          new Date(
            sessionControl.revoked_before
          ).getTime();

        if (
          Number.isFinite(
            revokedBeforeMs
          ) &&
          issuedAtMs <=
            revokedBeforeMs
        ) {
          return NextResponse.json(
            {
              valid: false,
              reason:
                "session-revoked",
            },
            {
              status: 401,
            }
          );
        }
      }
    }

    return NextResponse.json({
      valid: true,
      userId:
        authUser.id,
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