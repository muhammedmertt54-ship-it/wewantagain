import {
  NextRequest,
} from "next/server";

import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";
import {
  secureAdminApi,
} from "../../../../../lib/security/secureAdminApi";
import {
  parseJsonBody,
  secureJson,
} from "../../../../../lib/security/requestSecurity";

type CampaignStatus =
  | "pending"
  | "active"
  | "rejected";

type CampaignAction =
  | "set-status"
  | "remove-image"
  | "delete";

const MAX_BODY_BYTES =
  10_000;

const CAMPAIGN_MANAGE_RATE_LIMIT =
  30;

const CAMPAIGN_MANAGE_RATE_WINDOW_MS =
  60_000;

type CampaignManageBody = {
  campaignId?: unknown;
  action?: unknown;
  status?: unknown;
};

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
        admin_user_id: adminUserId,
        target_user_id: null,
        action,
        details: details ?? null,
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
  const security =
    await secureAdminApi(
      request,
      {
        scope:
          "admin-campaigns-manage",

        allowedRoles: [
          "owner",
          "admin",
          "moderator",
        ],

        requireSameOrigin:
          true,

        blockSuspiciousHeaders:
          true,

        rateLimit: {
          limit:
            CAMPAIGN_MANAGE_RATE_LIMIT,

          windowMs:
            CAMPAIGN_MANAGE_RATE_WINDOW_MS,
        },
      }
    );

  if (!security.ok) {
    return security.response;
  }

  const {
    requestId,
    user,
    admin,
  } = security;

  try {
    const parsed =
      await parseJsonBody<CampaignManageBody>(
        request,
        {
          maxBytes:
            MAX_BODY_BYTES,
        }
      );

    if (!parsed.ok) {
      return secureJson(
        {
          error:
            parsed.error,
          request_id:
            requestId,
        },
        {
          status:
            parsed.status,
          requestId,
        }
      );
    }

    const body =
      parsed.body;

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
      return secureJson(
        {
          error:
            "Invalid campaign ID.",
        },
        { status: 400, requestId }
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
      return secureJson(
        {
          error:
            "Invalid action.",
        },
        { status: 400, requestId }
      );
    }

    /*
     * Moderator may delete campaigns,
     * but image-only removal remains
     * restricted to Owner/Admin.
     */
    if (
      admin.role ===
        "moderator" &&
      action ===
        "remove-image"
    ) {
      return secureJson(
        {
          error:
            "Owner or admin access required to remove a campaign image.",
          request_id:
            requestId,
        },
        {
          status: 403,
          requestId,
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

      return secureJson(
        {
          error:
            "Campaign could not be loaded.",
        },
        { status: 500, requestId }
      );
    }

    if (!campaign) {
      return secureJson(
        {
          error:
            "Campaign not found.",
        },
        { status: 404, requestId }
      );
    }

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
        return secureJson(
          {
            error:
              "Invalid campaign status.",
          },
          { status: 400, requestId }
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

        return secureJson(
          {
            error:
              "Campaign status could not be updated.",
          },
          { status: 500, requestId }
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
          user.id,

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
            admin.role,
        },
      });

      return secureJson(
        {
          success: true,
          action:
            "set-status",
          campaign:
            updatedCampaign,
          request_id:
            requestId,
        },
        {
          requestId,
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

          return secureJson(
            {
              error:
                "Campaign image could not be removed from storage.",
            },
            { status: 500, requestId }
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

        return secureJson(
          {
            error:
              "Campaign image status could not be updated.",
          },
          { status: 500, requestId }
        );
      }

      await writeAuditLog({
        adminUserId:
          user.id,

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
            admin.role,
        },
      });

      return secureJson(
        {
          success: true,
          action:
            "remove-image",
          campaignId,
          request_id:
            requestId,
        },
        {
          requestId,
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

        return secureJson(
          {
            error:
              "Campaign support records could not be deleted.",
          },
          { status: 500, requestId }
        );
      }

      const {
        data:
          deletedCampaigns,
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
          )
          .select(
            "id"
          );

      if (
        deleteError
      ) {
        console.error(
          "Campaign delete error:",
          deleteError
        );

        return secureJson(
          {
            error:
              "Campaign could not be deleted.",
          },
          { status: 500, requestId }
        );
      }

      if (
        !deletedCampaigns ||
        deletedCampaigns.length !== 1
      ) {
        return secureJson(
          {
            error:
              "Campaign deletion could not be confirmed.",
            request_id:
              requestId,
          },
          {
            status: 500,
            requestId,
          }
        );
      }

      await writeAuditLog({
        adminUserId:
          user.id,

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
            admin.role,
        },
      });

      return secureJson(
        {
          success: true,
          action:
            "delete",
          campaignId,
          request_id:
            requestId,
        },
        {
          requestId,
        }
      );
    }

    return secureJson(
      {
        error:
          "Unknown action.",
      },
      { status: 400, requestId }
    );
  } catch (error) {
    console.error(
      "Campaign manage API error:",
      error
    );

    return secureJson(
      {
        error:
          "Unexpected server error.",
      },
      { status: 500, requestId }
    );
  }
}