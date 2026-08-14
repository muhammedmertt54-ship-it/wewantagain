import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  requireAdminRole,
  type AdminRole,
} from "../../../../lib/admin/requireAdminRole";

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminRole(request, [
      "owner",
      "admin",
      "moderator",
    ]);

    if (!auth.ok) {
      return auth.response;
    }

    const {
      data: authData,
      error: authUsersError,
    } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });

    if (authUsersError) {
      console.error(
        "Auth users error:",
        authUsersError
      );

      return NextResponse.json(
        {
          error:
            "Users could not be loaded.",
        },
        {
          status: 500,
        }
      );
    }

    const authUsers =
      authData.users ?? [];

    const userIds =
      authUsers.map(
        (user) =>
          user.id
      );

    let profiles: {
      user_id: string;
      username: string | null;
      display_name: string | null;
    }[] = [];

    let admins: {
      user_id: string;
      role: AdminRole;
    }[] = [];

    let userIps: {
      id: number;
      user_id: string;
      ip_address: string;
      first_seen_at: string;
      last_seen_at: string;
    }[] = [];

    if (
      userIds.length > 0
    ) {
      const {
        data:
          profileRows,
        error:
          profileError,
      } =
        await supabaseAdmin
          .from(
            "profiles"
          )
          .select(
            "user_id, username, display_name"
          )
          .in(
            "user_id",
            userIds
          );

      if (
        profileError
      ) {
        console.error(
          "Profiles error:",
          profileError
        );
      } else {
        profiles =
          profileRows ??
          [];
      }

      const {
        data:
          adminRows,
        error:
          adminsError,
      } =
        await supabaseAdmin
          .from(
            "admins"
          )
          .select(
            "user_id, role"
          )
          .in(
            "user_id",
            userIds
          );

      if (
        adminsError
      ) {
        console.error(
          "Admins error:",
          adminsError
        );
      } else {
        admins =
          (
            adminRows ??
            []
          ).filter(
            (
              row
            ): row is {
              user_id: string;
              role: AdminRole;
            } =>
              row.role ===
                "owner" ||
              row.role ===
                "admin" ||
              row.role ===
                "moderator"
          );
      }

      const {
        data:
          ipRows,
        error:
          ipsError,
      } =
        await supabaseAdmin
          .from(
            "user_ips"
          )
          .select(
            "id, user_id, ip_address, first_seen_at, last_seen_at"
          )
          .in(
            "user_id",
            userIds
          )
          .order(
            "last_seen_at",
            {
              ascending:
                false,
            }
          );

      if (
        ipsError
      ) {
        console.error(
          "User IPs error:",
          ipsError
        );
      } else {
        userIps =
          ipRows ??
          [];
      }
    }

    const {
      data:
        bannedIpRows,
      error:
        bannedIpsError,
    } =
      await supabaseAdmin
        .from(
          "ip_bans"
        )
        .select(
          "ip_address"
        );

    if (
      bannedIpsError
    ) {
      console.error(
        "IP bans error:",
        bannedIpsError
      );
    }

    const bannedIps =
      (
        bannedIpRows ??
        []
      )
        .map(
          (row) =>
            row.ip_address
        )
        .filter(
          (
            ip
          ): ip is string =>
            typeof ip ===
              "string" &&
            ip.length > 0
        );

    const profileMap =
      new Map(
        profiles.map(
          (
            profile
          ) => [
            profile.user_id,
            profile,
          ]
        )
      );

    const adminMap =
      new Map<
        string,
        AdminRole
      >(
        admins.map(
          (
            admin
          ) => [
            admin.user_id,
            admin.role,
          ]
        )
      );

    const ipMap =
      new Map<
        string,
        {
          id: number;
          ip_address: string;
          first_seen_at: string;
          last_seen_at: string;
        }[]
      >();

    for (
      const ip of userIps
    ) {
      const existing =
        ipMap.get(
          ip.user_id
        ) ?? [];

      existing.push({
        id:
          ip.id,
        ip_address:
          ip.ip_address,
        first_seen_at:
          ip.first_seen_at,
        last_seen_at:
          ip.last_seen_at,
      });

      ipMap.set(
        ip.user_id,
        existing
      );
    }

    const users =
      authUsers.map(
        (user) => {
          const profile =
            profileMap.get(
              user.id
            );

          const adminRole =
            adminMap.get(
              user.id
            ) ??
            null;

          return {
            id:
              user.id,

            email:
              user.email ??
              null,

            username:
              profile?.username ??
              null,

            display_name:
              profile?.display_name ??
              null,

            is_admin:
              adminRole !==
              null,

            admin_role:
              adminRole,

            created_at:
              user.created_at,

            last_sign_in_at:
              user.last_sign_in_at ??
              null,

            banned_until:
              user.banned_until ??
              null,

            email_confirmed_at:
              user.email_confirmed_at ??
              null,

            ips:
              ipMap.get(
                user.id
              ) ?? [],
          };
        }
      );

    return NextResponse.json(
      {
        users,

        banned_ips:
          bannedIps,

        current_admin_role:
          auth.admin.role,

        current_admin_user_id:
          auth.user.id,
      }
    );
  } catch (error) {
    console.error(
      "Admin users API error:",
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