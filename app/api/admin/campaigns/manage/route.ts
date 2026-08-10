import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../../lib/supabaseAdmin";

type CampaignAction = "remove-image" | "delete";

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
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request);

    if ("error" in auth) {
      return auth.error;
    }

    const body = await request.json();

    const campaignId = Number(body?.campaignId);

    const action =
      typeof body?.action === "string"
        ? (body.action as CampaignAction)
        : null;

    if (
      !Number.isInteger(campaignId) ||
      campaignId < 1
    ) {
      return NextResponse.json(
        { error: "Invalid campaign ID." },
        { status: 400 }
      );
    }

    if (
      !action ||
      !["remove-image", "delete"].includes(action)
    ) {
      return NextResponse.json(
        { error: "Invalid action." },
        { status: 400 }
      );
    }

    const {
      data: campaign,
      error: campaignError,
    } = await supabaseAdmin
      .from("campaigns")
      .select(
        "id, slug, image_path, image_url, image_removed"
      )
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError) {
      console.error(
        "Campaign lookup error:",
        campaignError
      );

      return NextResponse.json(
        { error: "Campaign could not be loaded." },
        { status: 500 }
      );
    }

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 }
      );
    }

    // ONLY REMOVE THE IMAGE
    if (action === "remove-image") {
      if (campaign.image_path) {
        const { error: storageError } =
          await supabaseAdmin.storage
            .from("campaign-images")
            .remove([campaign.image_path]);

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
            { status: 500 }
          );
        }
      }

      const { error: updateError } =
        await supabaseAdmin
          .from("campaigns")
          .update({
            image_url: null,
            image_path: null,
            image_removed: true,
          })
          .eq("id", campaignId);

      if (updateError) {
        console.error(
          "Campaign image update error:",
          updateError
        );

        return NextResponse.json(
          {
            error:
              "Campaign image status could not be updated.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "remove-image",
        campaignId,
      });
    }

    // DELETE WHOLE CAMPAIGN
    if (action === "delete") {
      if (campaign.image_path) {
        const { error: storageError } =
          await supabaseAdmin.storage
            .from("campaign-images")
            .remove([campaign.image_path]);

        if (storageError) {
          console.error(
            "Image cleanup warning:",
            storageError
          );
        }
      }

      const { error: supportsError } =
        await supabaseAdmin
          .from("supports")
          .delete()
          .eq(
            "campaign_slug",
            campaign.slug
          );

      if (supportsError) {
        console.error(
          "Support cleanup error:",
          supportsError
        );

        return NextResponse.json(
          {
            error:
              "Campaign support records could not be deleted.",
          },
          { status: 500 }
        );
      }

      const { error: deleteError } =
        await supabaseAdmin
          .from("campaigns")
          .delete()
          .eq("id", campaignId);

      if (deleteError) {
        console.error(
          "Campaign delete error:",
          deleteError
        );

        return NextResponse.json(
          {
            error:
              "Campaign could not be deleted.",
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        action: "delete",
        campaignId,
      });
    }

    return NextResponse.json(
      { error: "Unknown action." },
      { status: 400 }
    );
  } catch (error) {
    console.error(
      "Campaign manage API error:",
      error
    );

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}