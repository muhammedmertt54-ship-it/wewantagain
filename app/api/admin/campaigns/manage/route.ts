import {
  NextRequest,
  NextResponse,
} from "next/server";

import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { requireAdminRole } from "../../../../../lib/admin/requireAdminRole";

type CampaignStatus =
  | "pending"
  | "active"
  | "rejected";

type CampaignAction =
  | "set-status"
  | "remove-image"
  | "delete";

function isCampaignStatus(
  value: unknown
): value is CampaignStatus {
  return (
    value === "pending" ||
    value === "active" ||
    value === "rejected"
  );
}

async function writeAuditLog({
  adminUserId,
  action,
  details,
}: {
  adminUserId: string;
  action: string;
  details?: Record<string, unknown>;
}) {
  const { error } =
    await supabaseAdmin
      .from("admin_audit_logs")
      .insert({
        admin_user_id:
          adminUserId,
        target_user_id:
          null,
        action,
        details:
          details ?? null,
      });

  if (error) {
    console.error(
      "Campaign audit log error:",
      error
    );
  }
}

export async function POST(
  request: NextRequest
) {
  try {
    const auth =
      await requireAdminRole(
        request,
        [
          "owner",
          "admin",
          "moderator",
        ]
      );

    if (!auth.ok) {
      return auth.response;
    }

    const body =
      await request.json();

    const campaignId =
      Number(
        body?.campaignId
      );

    const action =
      typeof body?.action ===
      "string"
        ? (body.action as CampaignAction)
        : null;

    if (
      !Number.isInteger(
        campaignId
      ) ||
      campaignId < 1
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid campaign ID.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      !action ||
      ![
        "set-status",
        "remove-image",
        "delete",
      ].includes(action)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid action.",
        },
        {
          status: 400,
        }
      );
    }

    const {
      data: campaign,
      error: campaignError,
    } =
      await supabaseAdmin
        .from("campaigns")
        .select(
          "id, slug, title, status, image_path, image_url, image_removed"
        )
        .eq(
          "id",
          campaignId
        )
        .maybeSingle();

    if (campaignError) {
      console.error(
        "Campaign lookup error:",
        campaignError
      );

      return NextResponse.json(
        {
          error:
            "Campaign could not be loaded.",
        },
        {
          status: 500,
        }
      );
    }

    if (!campaign) {
      return NextResponse.json(
        {
          error:
            "Campaign not found.",
        },
        {
          status: 404,
        }
      );
    }

    /*
     * MODERATION ACTION
     *
     * owner / admin / moderator
     * can change campaign status.
     */
    if (
      action ===
      "set-status"
    ) {
      const newStatus =
        body?.status;

      if (
        !isCampaignStatus(
          newStatus
        )
      ) {
        return NextResponse.json(
          {
            error:
              "Invalid campaign status.",
          },
          {
            status: 400,
          }
        );
      }

      const previousStatus =
        campaign.status;

      const {
        data: updatedCampaign,
        error: updateError,
      } =
        await supabaseAdmin
          .from("campaigns")
          .update({
            status:
              newStatus,
          })
          .eq(
            "id",
            campaignId
          )
          .select(
            "id, slug, title, status"
          )
          .single();

      if (updateError) {
        console.error(
          "Campaign status update error:",
          updateError
        );

        return NextResponse.json(
          {
            error:
              "Campaign status could not be updated.",
          },
          {
            status: 500,
          }
        );
      }

      let auditAction =
        "campaign-status-updated";

      if (
        newStatus ===
        "active"
      ) {
        auditAction =
          "campaign-approved";
      } else if (
        newStatus ===
        "rejected"
      ) {
        auditAction =
          "campaign-rejected";
      } else if (
        newStatus ===
        "pending"
      ) {
        auditAction =
          "campaign-moved-to-pending";
      }

      await writeAuditLog({
        adminUserId:
          auth.user.id,

        action:
          auditAction,

        details: {
          campaign_id:
            campaignId,

          campaign_slug:
            campaign.slug,

          campaign_title:
            campaign.title,

          previous_status:
            previousStatus,

          new_status:
            newStatus,

          admin_role:
            auth.admin.role,
        },
      });

      return NextResponse.json(
        {
          success: true,

          action:
            "set-status",

          campaign:
            updatedCampaign,
        }
      );
    }

    /*
     * DESTRUCTIVE ACTIONS
     *
     * moderator is NOT allowed.
     */
    if (
      auth.admin.role ===
      "moderator"
    ) {
      return NextResponse.json(
        {
          error:
            "Owner or admin access required for this action.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      action ===
      "remove-image"
    ) {
      if (
        campaign.image_path
      ) {
        const {
          error:
            storageError,
        } =
          await supabaseAdmin
            .storage
            .from(
              "campaign-images"
            )
            .remove([
              campaign.image_path,
            ]);

        if (storageError) {
          console.error(
            "Image removal error:",
            storageError
          );

          return NextResponse.json(
            {
              error:
                "Campaign image could not be removed from storage.",
            },
            {
              status: 500,
            }
          );
        }
      }

      const {
        error:
          updateError,
      } =
        await supabaseAdmin
          .from(
            "campaigns"
          )
          .update({
            image_url:
              null,

            image_path:
              null,

            image_removed:
              true,
          })
          .eq(
            "id",
            campaignId
          );

      if (
        updateError
      ) {
        console.error(
          "Campaign image update error:",
          updateError
        );

        return NextResponse.json(
          {
            error:
              "Campaign image status could not be updated.",
          },
          {
            status: 500,
          }
        );
      }

      await writeAuditLog({
        adminUserId:
          auth.user.id,

        action:
          "campaign-image-removed",

        details: {
          campaign_id:
            campaignId,

          campaign_slug:
            campaign.slug,

          campaign_title:
            campaign.title,

          admin_role:
            auth.admin.role,
        },
      });

      return NextResponse.json(
        {
          success: true,

          action:
            "remove-image",

          campaignId,
        }
      );
    }

    if (
      action ===
      "delete"
    ) {
      if (
        campaign.image_path
      ) {
        const {
          error:
            storageError,
        } =
          await supabaseAdmin
            .storage
            .from(
              "campaign-images"
            )
            .remove([
              campaign.image_path,
            ]);

        if (
          storageError
        ) {
          console.error(
            "Image cleanup warning:",
            storageError
          );
        }
      }

      const {
        error:
          supportsError,
      } =
        await supabaseAdmin
          .from("supports")
          .delete()
          .eq(
            "campaign_slug",
            campaign.slug
          );

      if (
        supportsError
      ) {
        console.error(
          "Support cleanup error:",
          supportsError
        );

        return NextResponse.json(
          {
            error:
              "Campaign support records could not be deleted.",
          },
          {
            status: 500,
          }
        );
      }

      const {
        error:
          deleteError,
      } =
        await supabaseAdmin
          .from(
            "campaigns"
          )
          .delete()
          .eq(
            "id",
            campaignId
          );

      if (
        deleteError
      ) {
        console.error(
          "Campaign delete error:",
          deleteError
        );

        return NextResponse.json(
          {
            error:
              "Campaign could not be deleted.",
          },
          {
            status: 500,
          }
        );
      }

      await writeAuditLog({
        adminUserId:
          auth.user.id,

        action:
          "campaign-deleted",

        details: {
          campaign_id:
            campaignId,

          campaign_slug:
            campaign.slug,

          campaign_title:
            campaign.title,

          admin_role:
            auth.admin.role,
        },
      });

      return NextResponse.json(
        {
          success: true,

          action:
            "delete",

          campaignId,
        }
      );
    }

    return NextResponse.json(
      {
        error:
          "Unknown action.",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error(
      "Campaign manage API error:",
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